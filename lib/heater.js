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

function future () {
  const future = {}

  future.promise = new Promise((resolve, reject) => {
    future.resolve = resolve
    future.reject = reject
  })

  return future
}

async function heat () {
  const { fork } = require('child_process')
  const throttle = require('@buzuli/throttle')
  const buzJson = require('@buzuli/json')
  const meter = require('@buzuli/meter')
  const metrics = meter()
  const notify = throttle({
    minDelay: 5000,
    maxDelay: 5000,
    reportFunc: () => {
      log(buzJson(metrics.asObject({ sort: true })))
    }
  })

  const os = require('os')
  const coilCount = (os.cpus() || []).length || 2
  const coils = {}

  let halting = false
  const allHalted = future()

  // Check if all coils are halted
  const checkHalted = () => {
    if (Object.keys(coils).length < 1) {
      allHalted.resolve()
    }
  }

  // Halt a single coil
  const haltCoil = coilId => {
    const coil = coils[coilId]
    if (coil) {
      coil.send({ command: 'halt' })
    }
  }

  // Instruct all active coils to halt
  const halt = () => {
    if (!halting) {
      halting = true
      Object.keys(coils).forEach(coilId => haltCoil(coilId))
    }
  }

  const shutdown = signal => () => {
    log(`Received '${signal}' signal. Initiating shutdown ...`)
    halt()
  }

  const metricsFrom = coilId => coilMetrics => metrics.merge(meter(coilMetrics))

  // Handle events from coils
  const messageHandler = coilId => ({ event, data }) => {
    switch (event) {
      case 'log':
        return logFrom(coilId)(data)
      case 'metrics':
        return metricsFrom(coilId)(data)
      case 'start':
        return log(`coil-${coilId} heating ...`)
      case 'halt':
        delete coils[coilId]
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

    coils[i] = coil
  }

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
