#! /usr/bin/env node

const os = require('os')
const yargs = require('yargs')
const heater = require('../lib/heater')

;(async () => {
  try {
    const defaultCoilCount = (os.cpus() || []).length || 2
    const {
      coils: coilCount
    } = yargs
      .env('SPACEHEATER')
      .command('$0', 'Spin CPUs', yarg => {
        yargs
          .option('coils', {
            type: 'number',
            desc: 'Number of coils (processes) to spawn (defaults to number of vCPUs)',
            default: defaultCoilCount,
            alias: ['processes', 'c', 'p']
          })
      })
      .parse()

    await heater({
      coilCount
    })
  } catch (error) {
    console.error('Fatal:', error)
    process.exit(1)
  }
})()
