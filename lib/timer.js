module.exports = timer

function timer () {
  const start = Date.now()
  return () => Date.now() - start
}
