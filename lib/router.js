/**
 * Router
 */

'use strict'

const config = require('../config')
const logger = require('./logger')
const Workers = require('./workers')

/**
 * @constructor
 * @classdesc Routes incoming messages to workers
 */
const Router = function () {
  this.workers = new Workers().load(config.get('workers.path'))
}

/**
* Route a message to a worker
* @param {req} req - the request object, constructed in the Broker when the 'data' event is received
* @param {RSMQ} queue - the queue instance
* @param {function} done - the callback to fire after the worker completes. Calls Broker.processResponse() internally
*/
Router.prototype.route = function (req, queue, done) {
  let worker = this.getWorker(req)

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
  let segments = req.message.split(':')
  let workers = find(segments, this.workers)

  let worker = workers.slice(-1)[0]

  if (typeof worker !== 'function') {
    return null
  }

  req.address = segments.slice(0, workers.length)
  req.data = this.getWorkerData(segments, workers)

  logger.info({ id: req.message }, 'Routing')

  return worker
}

/**
 * Extract the last part of the message to use as data for the worker
 * @param {Array} segments  - the message string split by ':', for example [ 'sms', 'send-reminder', '123456' ]
 * @param {Array} workers  - the workers identified that can handle the message, for example [ 'sms', 'send-reminder' ]
 */
Router.prototype.getWorkerData = function (segments, workers) {
  return segments.slice(workers.length).toString()
}

// find all matching elements in address chain
function find (segments, workers) {
  return segments.map((value, i) => {
    let segment = segments.slice(0, i + 1)
    return segment.reduce((head, next) => head && head[next], workers)
  }).filter(Boolean)
}

module.exports = Router
