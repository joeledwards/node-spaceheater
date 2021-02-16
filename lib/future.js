module.exports = future

function future () {
  const future = {}

  future.promise = new Promise((resolve, reject) => {
    future.resolve = resolve
    future.reject = reject
  })

  return future
}
