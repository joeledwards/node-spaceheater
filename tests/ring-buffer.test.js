const tap = require('tap')
const ringBuffer = require('../lib/ring-buffer')

tap.test('ring-buffer should allocate a buffer of the requested size', async assert => {
  const buffer = ringBuffer(10)

  assert.equal(buffer.capacity(), 10)
})

tap.test('ring-buffer should fetching a value at an index', async assert => {
  const buffer = ringBuffer(5, true)

  assert.equal(buffer.next(), buffer.value(0))
  assert.equal(buffer.next(), buffer.value(1))
  assert.equal(buffer.next(), buffer.value(2))
  assert.equal(buffer.next(), buffer.value(3))
  assert.equal(buffer.next(), buffer.value(4))

  assert.notEqual(buffer.next(), buffer.value(4))
  assert.notEqual(buffer.next(), buffer.value(3))
  assert.equal(buffer.next(), buffer.value(2))
  assert.notEqual(buffer.next(), buffer.value(1))
  assert.notEqual(buffer.next(), buffer.value(0))
})

tap.test('ring-buffer should return null for an invalid index', async assert => {
  const buffer = ringBuffer(5, true)

  assert.same(null, buffer.value(5))
})

tap.test('ring-buffer defaults to null values', async assert => {
  const buffer = ringBuffer(2)
  const a = buffer.next()
  const b = buffer.next()

  assert.same(a, null)
  assert.same(b, null)
})

tap.test('ring-buffer can be initialized with float values', async assert => {
  const buffer = ringBuffer(2, true)
  const a = buffer.next()
  const b = buffer.next()

  assert.notEqual(a, b)
})

tap.test('ring-buffer will rotate through all values via next()', async assert => {
  const buffer = ringBuffer(3, true)
  const a = buffer.next()
  const b = buffer.next()
  const c = buffer.next()
  const d = buffer.next()
  const e = buffer.next()
  const f = buffer.next()
  const g = buffer.next()

  assert.equal(a, d)
  assert.equal(d, g)
  assert.equal(b, e)
  assert.equal(c, f)

  assert.notEqual(a, b)
  assert.notEqual(b, c)
})

tap.test('ring-buffer will copy from another via fill()', async assert => {
  const bufA = ringBuffer(2, true)
  const bufB = ringBuffer(2)

  assert.notSame(bufA.next(), null)
  assert.notSame(bufA.next(), null)
  assert.same(bufB.next(), null)
  assert.same(bufB.next(), null)

  bufB.fill(bufA)
  assert.equal(bufA.next(), bufB.next())
  assert.equal(bufA.next(), bufB.next())

  bufA.next()
  assert.notEqual(bufA.next(), bufB.next())
  assert.notEqual(bufA.next(), bufB.next())

  bufA.next()
  assert.equal(bufA.next(), bufB.next())
  assert.equal(bufA.next(), bufB.next())
})
