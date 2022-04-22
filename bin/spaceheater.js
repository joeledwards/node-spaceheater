#! /usr/bin/env node

const c = require('@buzuli/color')
const os = require('os')
const yargs = require('yargs')
const heater = require('../lib/heater')
const buzJson = require('@buzuli/json')
const durations = require('durations')
const prettyBytes = require('pretty-bytes')

;(async () => {
  try {
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

    logSystemInfo()

    await heater({
      coilCount,
      quiet,
      reportDelay
    })

    logSystemInfo()
  } catch (error) {
    console.error('Fatal:', error)
    process.exit(1)
  }
})()

function logSystemInfo () {
  const cpuMap = {}
  os.cpus().forEach((cpu, index) => {
    const { model } = cpu
    let record = cpuMap[model]
    if (!record) {
      record = {
        count: 0,
      }
      cpuMap[model] = record
    }
    record.count = record.count + 1
  })

  const cpuStr = Object
    .entries(cpuMap)
    .map(([model, { count }]) =>
      `${c.blue(model)} x ${c.orange(count)}`
    )
    .join(' | ')

  console.info('======================================')
  console.info(`    Name: ${c.yellow(os.userInfo().username)}@${c.green(os.hostname())}`)
  console.info(`      OS: ${c.blue(os.platform())} on ${c.yellow(os.arch())}`)
  console.info(`    CPUs: ${cpuStr}`)
  console.info(`  Memory: ${c.orange(prettyBytes(os.totalmem()))}`)
  console.info(`  Uptime: ${c.blue(durations.seconds(os.uptime()))}`)
  console.info('======================================')
}
