#!/usr/bin/env node

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
  let running = true
  const isRunning = () => running

  process.on('message', handleMessage)

  function handleMessage ({ command, data } = {}) {
    switch (command) {
      case 'halt':
        running = false
    }
  }

  const elapsed = timer()
  const cyclone = memCyclone(128)
  const initTime = (elapsed() / 1000.0).toFixed(3)
  const notify = throttle({
    minDelay: 1000,
    maxDelay: 1000,
    reportFunc: () => process.send({ event: 'metrics', data: metrics.serialize()  })
  })

  process.send({ event: 'start' })
  process.send({ event: 'log', data: `Init took ${initTime} seconds` })

  while (isRunning()) {
    await flame(cyclone, metrics)
    metrics.add('coil.flames')
  }

  process.send({ event: 'log', data: `Finished` })

  notify({ halt: true, force: true })
  process.send({ event: 'halt' })
}

// Spike the CPU a while, then permit I/O handling
async function flame (cyclone, metrics) {
  const start = Date.now()
  const elapsed = () => Date.now() - start

  let nrand
  let cycles = 0

  while (elapsed() <= haltCheckFrequency) {
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
