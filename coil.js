#!/usr/bin/env node

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
        process.send({ event: 'halt', data: {} })
    }
  }

  process.send({ event: 'start' })

  while (isRunning()) {
    await flame()
  }

  process.send({ event: 'halt' })
}

// Spike the CPU a while, then permit I/O handling
async function flame () {
  const start = Date.now()
  const elapsed = () => Date.now() - start

  while (elapsed() <= 50) {
    // BURN!!
  }

  await sleep(0)
}

// Delay for a while
async function sleep (delay) {
  return new Promise(resolve => setTimeout(resolve, delay))
}
