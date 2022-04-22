#! /usr/bin/env node

const c = require('@buzuli/color')
const os = require('os')
const yargs = require('yargs')
const heater = require('../lib/heater')

;(async () => {
  try {
    const cpus = os.cpus();
    const defaultCoilCount = (os.cpus() || []).length || 2
    const {
      delay: reportDelay,
      coils: coilCount,
      quiet
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
          .option('delay', {
            type: 'number',
            desc: 'Delay between metrics reports in seconds',
            default: 5.0,
            alias: ['d', 'report-delay']
          })
          .option('quiet', {
            type: 'boolean',
            desc: 'just apply heat, do not output performance statistics',
            alias: ['q']
          })
      })
      .parse()

    cpus.forEach((cpu, index) => {
      console.info(`CPU ${c.orange(index)}: ${c.blue(cpu.model)}`)
    })

    await heater({
      coilCount,
      quiet,
      reportDelay
    })
  } catch (error) {
    console.error('Fatal:', error)
    process.exit(1)
  }
})()
