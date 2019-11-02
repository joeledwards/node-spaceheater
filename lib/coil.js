#!/usr/bin/env node

;(async () => {
  try {
    await coil()
  } catch (error) {
    console.error('Fatal', error)
    process.send({ event: 'log', data: `Fatal ${error}` })
  }
})()

const memCyclone = require('./mem-cyclone')
const sleep = require('./sleep')
const timer = require('./timer')

async function coil () {
  let running = true
  const isRunning = () => running

  process.on('message', handleMessage)

  function handleMessage ({ command, data } = {}) {
    switch (command) {
      case 'halt':
        running = false
        process.send({ event: 'halt', data: {} })
    }
  }

  const elapsed = timer()
  const cyclone = memCyclone(128)
  const initTime = (elapsed() / 1000.0).toFixed(3)

  process.send({ event: 'start' })
  process.send({ event: 'log', data: `Init took ${initTime} seconds` })

  while (isRunning()) {
    await flame(cyclone)
  }

  process.send({ event: 'halt' })
}

// Spike the CPU a while, then permit I/O handling
async function flame (cyclone) {
  const start = Date.now()
  const elapsed = () => Date.now() - start

  let nrand

  while (elapsed() <= 50) {
    // BURN!!

    // A little FP math
    const [, ns] = process.hrtime()
    const rand = Math.random()
    nrand = ns * rand

    // Spin the cyclone
    cyclone.spin(1)
  }

  await sleep(0)

  return {
    nrand
  }
}
