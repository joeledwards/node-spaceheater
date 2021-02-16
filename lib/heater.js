#!/usr/bin/env node

;(async () => {
  try {
    await heat()
  } catch (error) {
    console.error('Fatal:', error)
    process.exit(1)
  }
})()

function timestamp () {
  return (new Date()).toISOString()
}

function logFrom (coilId) {
  const id = coilId ? `coil-${coilId}` : 'heater'
  return (...args) => console.info(`[${timestamp()}] ${id}>`, ...args)
}

function log (...args) {
  logFrom()(...args)
}

async function heat () {
  const os = require('os')
  const { fork } = require('child_process')
  const throttle = require('@buzuli/throttle')
  const buzJson = require('@buzuli/json')
  const meter = require('@buzuli/meter')
  const future = require('./future')
  const { stopwatch } = require('durations')

  const watch = stopwatch()
  const metrics = meter()
  const notify = throttle({
    minDelay: 5000,
    maxDelay: 5000,
    reportFunc: () => {
      const rate = metrics.get('coil.flames.cycles') / watch.duration().seconds()
      metrics.set('elapsed.seconds', watch.duration().seconds())
      metrics.set('rate.cps', rate)
      log(buzJson(metrics.asObject({ sort: true })))
    }
  })

  const coilCount = (os.cpus() || []).length || 2
  const coils = new Map()
  const readySet = new Set()

  let halting = false
  const allHalted = future()
  const allReady = future()

  // Check if all coils are ready
  const checkReady = () => {
    if (readySet.size == coilCount) {
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

  const metricsFrom = coilId => coilMetrics => {
    log(`Received metrics from coil-${coilId}`)
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
        coil = coils.get(coilId)
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

  watch.start()
  log(`All coils are ready and synchronized. Starting ...`)
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
}
