const tap = require('tap')
const memCyclone = require('../lib/mem-cyclone')

tap.test('mem-cyclone should be initialized with five different sized sub ring-buffers', async assert => {
  const c = memCyclone(1)

  assert.ok(c.buffers.tiny.capacity() < c.buffers.small.capacity())
  assert.ok(c.buffers.small.capacity() < c.buffers.medium.capacity())
  assert.ok(c.buffers.medium.capacity() < c.buffers.large.capacity())
  assert.ok(c.buffers.large.capacity() < c.buffers.huge.capacity())
})

tap.test('mem-cyclone spin should populate sub-buffers from one another', async assert => {
  const c = memCyclone(1)

  assert.same(c.buffers.tiny.value(0), null)
  assert.same(c.buffers.small.value(0), null)
  assert.same(c.buffers.medium.value(0), null)
  assert.same(c.buffers.large.value(0), null)
  assert.notSame(c.buffers.huge.value(0), null)

  c.spin(1)

  assert.equal(c.buffers.tiny.value(0), c.buffers.small.value(0))
  assert.equal(c.buffers.small.value(0), c.buffers.medium.value(0))
  assert.equal(c.buffers.medium.value(0), c.buffers.large.value(0))
  assert.equal(c.buffers.large.value(0), c.buffers.huge.value(0))
  assert.notSame(c.buffers.huge.value(0), null)
})

tap.test('mem-cyclone factor impacts all buffer sizes', async assert => {
  const a = memCyclone(1)
  const b = memCyclone(2)
  const c = memCyclone()

  assert.equal(a.buffers.tiny.capacity(), 1)
  assert.equal(b.buffers.tiny.capacity(), 2)
  assert.equal(c.buffers.tiny.capacity(), 128)

  assert.equal(a.buffers.tiny.capacity() * 2, b.buffers.tiny.capacity())
  assert.equal(a.buffers.small.capacity() * 2, b.buffers.small.capacity())
  assert.equal(a.buffers.medium.capacity() * 2, b.buffers.medium.capacity())
  assert.equal(a.buffers.large.capacity() * 2, b.buffers.large.capacity())
  assert.equal(a.buffers.huge.capacity() * 2, b.buffers.huge.capacity())
})
