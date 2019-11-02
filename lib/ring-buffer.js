module.exports = ringBuffer

function ringBuffer (capacity, init = false) {
  const buffer = new Array(capacity)
  let readCursor = 0

  const next = () => {
    const value = buffer[readCursor]
    const nextCursor = readCursor + 1
    readCursor = (nextCursor < capacity) ? nextCursor : 0
    return value
  }

  const fill = source => {
    for (let i = 0; i < capacity; i++) {
      buffer[i] = source.next()
    }
  }

  if (init) {
    for (let i = 0; i < capacity; i++) {
      buffer[i] = Math.random()
    }
  }

  return {
    fill,
    next,
    capacity: () => capacity,
    value: index => (index < capacity) ? buffer[index] : null
  }
}
