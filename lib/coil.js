#!/usr/bin/env node

const future = require('./future')
const memCyclone = require('./mem-cyclone')
const sleep = require('./sleep')
const timer = require('./timer')

const meter = require('@buzuli/meter')
const throttle = require('@buzuli/throttle')

const metrics = meter()

const haltCheckFrequency = 50

;(async () => {
  try {
    await coil()
  } catch (error) {
    console.error('Fatal', error)
    process.send({ event: 'log', data: `Fatal ${error}` })
  }
})()

async function coil () {
  let id
  let running = true
  const idResolved = future()
  const isRunning = () => running

  process.on('message', handleMessage)
  function handleMessage ({ command, data } = {}) {
    switch (command) {
      case 'halt':
        running = false
        return
      case 'id':
        idResolved.resolve(data.id)
        return
    }
  }

  process.on('SIGINT', () => { /* Ignore */ })

  const elapsed = timer()
  const cyclone = memCyclone(128)
  const initTime = (elapsed() / 1000.0).toFixed(3)
  const notify = throttle({
    minDelay: 1000,
    maxDelay: 1000,
    reportFunc: () => {
      process.send({ event: 'metrics', data: metrics.serialize()  })
      metrics.clear()
    }
  })

  process.send({ event: 'log', data: `Init took ${initTime} seconds [pid=${process.pid}]` })
  process.send({ event: 'ready'})

  id = await idResolved.promise

  while (isRunning()) {
    await flame(cyclone, metrics, id, isRunning)
    metrics.add('coil.flames')
  }

  process.send({ event: 'log', data: `Finished` })

  notify({ halt: true, force: true })
  process.send({ event: 'halt' })

  process.removeAllListeners()
}

// Spike the CPU a while, then permit I/O handling
async function flame (cyclone, metrics, id, isRunning) {
  const start = Date.now()
  const elapsed = () => Date.now() - start

  let nrand
  let cycles = 0

  while (isRunning() && elapsed() <= haltCheckFrequency) {
    // BURN!!

    // A little FP math
    const [, ns] = process.hrtime()
    const rand = Math.random()
    nrand = ns * rand

    // Spin the cyclone
    cyclone.spin(1)

    cycles++
    metrics.add('coil.flames.cycles')
  }

  await sleep(0)

  return {
    cycles,
    nrand
  }
}
