#!/usr/bin/env node

module.exports = heat

async function heat (args) {
  const c = require('@buzuli/color')
  const meter = require('@buzuli/meter')
  const future = require('./future')
  const moment = require('moment')
  const buzJson = require('@buzuli/json')
  const throttle = require('@buzuli/throttle')

  const { fork } = require('child_process')
  const { stopwatch } = require('durations')

  const {
    coilCount,
    quiet,
    reportDelay
  } = args

  const cp = c.pool()

  function timeString () {
    const ts = moment()
    const date = ts.format('YYYY-MM-DD')
    const time = ts.format('HH:mm:ss.SSS')
    return `${c.grey(date)} ${c.yellow(time)}`
  }

  function logFrom (coilId) {
    const id = coilId ? `coil-${coilId}` : 'heater'
    return (...args) => {
      if (!quiet) {
        console.info(`[${timeString()}] ${cp(id)}>`, ...args)
      }
    }
  }

  function log (...args) {
    logFrom()(...args)
  }

  const watch = stopwatch()

  const coils = new Map()
  const readySet = new Set()

  let halting = false
  const allHalted = future()
  const allReady = future()

  // Check if all coils are ready
  const checkReady = () => {
    if (readySet.size === coilCount) {
      allReady.resolve()
    }
  }

  // Check if all coils are halted
  const checkHalted = () => {
    if (coils.size < 1) {
      allHalted.resolve()
    }
  }

  // Halt a single coil
  const haltCoil = coilId => {
    const coil = coils.get(coilId)
    if (coil) {
      coil.send({ command: 'halt' })
    }
  }

  // Instruct all active coils to halt
  const halt = () => {
    if (!halting) {
      halting = true
      coils.forEach((_, coilId) => haltCoil(coilId))
    }
  }

  const shutdown = signal => () => {
    log(`Received '${signal}' signal. Initiating shutdown [${process.pid}] ...`)
    halt()
  }

  const metrics = meter({
    'coil.flames.cycles': 0
  })

  const metricsFrom = coilId => coilMetrics => {
    metrics.merge(meter(coilMetrics))
  }

  // Handle events from coils
  const messageHandler = coilId => ({ event, data }) => {
    switch (event) {
      case 'log':
        return logFrom(coilId)(data)
      case 'metrics':
        return metricsFrom(coilId)(data)
      case 'ready':
        readySet.add(coilId)
        checkReady()
        return log(`coil-${coilId} heating ...`)
      case 'halt':
        coils.delete(coilId)
        log(`coil-${coilId} halted`)
        return checkHalted()
      default:
        return log(`coil-${coilId} sent unrecognized event '${event}' | data =>`, data)
    }
  }

  // Fork all coil processes
  const coilModule = require.resolve('./coil')
  for (let i = 1; i <= coilCount; i++) {
    const coil = fork(coilModule)

    coil.on('message', messageHandler(i))

    coils.set(i, coil)
  }

  await allReady.promise

  const fx = n => n.toFixed(3)

  const notify = throttle({
    minDelay: reportDelay * 1000,
    maxDelay: reportDelay * 1000,
    reportFunc: () => {
      const cycles = metrics.get('coil.flames.cycles')
      const elapsed = watch.duration().seconds()
      const rate = cycles / elapsed
      metrics.set('elapsed.seconds', watch.duration().seconds())
      metrics.set('rate.cps', rate)
      log(`${c.orange(fx(cycles))} cycles | ${c.blue(fx(elapsed))} s | ${c.yellow(fx(rate))} c/s`)
    }
  })

  watch.start()
  log('All coils are ready and synchronized. Starting ...')
  coils.forEach((coil, id) => coil.send({ command: 'id', data: { id } }))

  // Setup shutdown hooks
  process.on('SIGINT', shutdown('SIGINT'))
  process.on('SIGTERM', shutdown('SIGTERM'))

  // All coils heated
  log(`Heating with ${coilCount} coils ...`)

  // Wait until all coils have halted
  await allHalted.promise

  // Shutdown
  log('All coils halted. Cooling ...')
  notify({ halt: true, force: true })

  log(buzJson(metrics.asObject({ sort: true })))
}
