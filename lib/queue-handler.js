'use strict'

/**
 * QueueHandler
 */
const logger = require('./logger')
const Broker = require('./broker')
const router = require('./router')()

/**
 * @constructor
 * @classdesc Starts the message broker, delegates messages to
 * workers via the router, and handles errors
 */
var QueueHandler = function () {
  this.queue = new Broker(this)
}

QueueHandler.prototype.handle = function (err, req, done) {
  if (err) {
    var level = err.level || 'error'
    logger[level](err.toJSON(), err.toString())
  } else {
    router.route(req, this.queue, done)
  }
}

module.exports = QueueHandler
