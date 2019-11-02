module.exports = memCyclone

const ringBuffer = require('./ring-buffer')

function memCyclone (factor = 128) {
  const tiny = ringBuffer(factor)
  const small = ringBuffer(2 * 8 * factor)
  const medium = ringBuffer(16 * 8 * factor)
  const large = ringBuffer(128 * 8 * factor)
  const huge = ringBuffer(20 * 1024 * 8 * factor, true)

  function spin (cycles) {
    let remaining = cycles
    while (remaining > 0) {
      large.fill(huge)
      medium.fill(large)
      small.fill(medium)
      tiny.fill(small)
      remaining--
    }
  }

  return {
    spin,
    buffers: {
      tiny,
      small,
      medium,
      large,
      huge
    }
  }
}
