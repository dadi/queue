'use strict'

const logger = require('./logger')
const Broker = require('./broker')
const Router = require('./router')

/**
 * QueueHandler
 */

/**
 * @constructor
 * @classdesc Starts the message broker, delegates messages to
 * workers via the router, and handles errors
 */
const QueueHandler = function () {
  this.router = new Router()
  this.queue = new Broker(this)
}

/**
 *
 */
QueueHandler.prototype.handle = function (err, req, done) {
  if (err) {
    const level = err.level || 'error'
    logger[level](err.toJSON(), err.toString())
  } else {
    this.router.route(req, this.queue, done)
  }
}

module.exports = QueueHandler
