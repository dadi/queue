'use strict'

const logger = require('./logger')

/**
 * Message Router
 */
var Router = function () {
  this.workers = require('./loader')
}

/**
* Route incoming messages to workers
* @param {object} req - contains the message and message metadata such as retries, timeout, age, sent. Constructed in the broker when the 'data' event is received.
* @param {rsmq} queue - the queue instance
* @param {function} done - the callback to fire after the worker completes. Calls broker.done() internally.
*/
Router.prototype.route = function (req, queue, done) {
  var worker = this.getWorker(req)

  if (!worker) {
    return done()
  }

  worker(req, queue, done)
}

/**
 *
 */
Router.prototype.getWorker = function (req) {
  var segments = req.message.split(':')
  var workers = find(segments, this.workers)

  var worker = workers.slice(-1)[0]

  if (typeof worker !== 'function') {
    return null
  }

  req.address = segments.slice(0, workers.length)
  req.data = segments.slice(workers.length).toString()

  logger.info({ id: req.message }, 'Routing')

  return worker
}

// find all matching elements in address chain
function find (segments, workers) {
  return segments.map((value, i) => {
    var segment = segments.slice(0, i + 1)
    return segment.reduce((head, next) => head && head[next], workers)
  }).filter(Boolean)
}

module.exports = function () {
  return new Router()
}
