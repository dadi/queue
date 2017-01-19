/**
 * Router
 */

'use strict'

var config = require('../config')
var logger = require('./logger')
var Workers = require('./workers')

/**
 * @constructor
 * @classdesc Routes incoming messages to workers
 */
var Router = function () {
  this.workers = new Workers().load(config.get('workers.path'))
}

/**
* Route a message to a worker
* @param {req} req - the request object, constructed in the Broker when the 'data' event is received
* @param {RSMQ} queue - the queue instance
* @param {function} done - the callback to fire after the worker completes. Calls Broker.processResponse() internally
*/
Router.prototype.route = function (req, queue, done) {
  var worker = this.getWorker(req)

  if (!worker) {
    return done()
  }

  worker(req, queue, done)
}

/**
 * Finds a worker with a name that matches the message request
 * @param {req} req - the request object
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
