const workers = require('./loader')
const logger = require('./logger')

/*
 * Message Router -
 * Routes incoming messages to workers
 */
module.exports = function router (req, queue, done) {
  var worker = route()
  if (!worker) return done()
  else worker(req, queue, done)
  
  // find worker at end of address chain
  function route () {
    var segments = req.message.split(':')
    var workers = find(segments)
    var worker = workers.slice(-1)[0]
    if (typeof worker !== 'function') return false
    req.address = segments.slice(0, workers.length)
    req.data = segments.slice(workers.length).toString()
    logger.info({ id: req.message }, 'Routing')
    return worker
  }

  // find all matching elements in address chain
  function find (segments) {
    return segments.map((value, i) => {
      var segment = segments.slice(0, i + 1)
      return segment.reduce((head, next) => head && head[next], workers)
    }).filter(Boolean)
  }
}