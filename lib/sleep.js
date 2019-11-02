module.exports = sleep

async function sleep (delay) {
  return new Promise(resolve => setTimeout(resolve, delay))
}
