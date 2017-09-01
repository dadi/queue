'use strict'

/**
 * @typedef req
 * @type {Object}
 * @property {String} message - The full message
 * @property {Array} address - The parts of the message containing its route
 * @property {Object} data - Any additional parts of the message for the worker to use
 * @property {Number} retries - The remaining number of times that this message will be retried before being deleted
 * @property {Date} timeout - A timestamp representing when this message will be placed back on the queue
 * @property {Date} age - A timestamp representing when this message was received by the broker
 * @property {Date} sent - A timestamp representing when the message was sent
 */

const colors = require('colors') // eslint-disable-line
const config = require('../config')
const errs = require('./errors')
const Rsmq = require('rsmq-worker')
const Throttle = require('./throttle')

if (config.get('env') !== 'test') {
  // add timestamps in front of log messages
  require('console-stamp')(console, 'yyyy-mm-dd HH:MM:ss.l')
}

/**
 * Message Broker
 */

/**
 * @constructor
 * @classdesc Polls the queue server for messages, builds requests
 * for the router and handles errors
 * @param {QueueHandler} queueHandler - an instance of the QueueHandler, with a `handle` method
 * that can be called when a message is received
 */
const Broker = function (queueHandler) {
  this.opts = config.get('broker')
  this.queueHandler = queueHandler
  this.rsmq = this.initialiseQueue(this.opts)
  this.throttle = this.initialiseThrottle(this.opts)

  // message received
  this.rsmq.on('message', (msg, next) => {
    this.throttle.increaseWorkerCount()
    next(false) // next message but don't delete
  })

  // message data received
  this.rsmq.on('data', (msg) => {
    const now = Date.now() / 1000
    const noop = () => {}

    this.throttle.throttleQueueMessage(msg, noop, () => {
      const req = {
        message: msg.message,
        address: [],
        data: null,
        retries: this.opts.retries - msg.rc,
        timeout: now + this.opts.timeout,
        age: now + msg.sent,
        sent: msg.sent
      }

      // call the handler with the message
      this.queueHandler.handle(null, req, (err) => {
        if (this.processResponse(req, err)) {
          // delete message on success
          this.rsmq.del(msg.id)
        }

        this.throttle.decreaseWorkerCount()
      })
    })
  })

  this.rsmq.on('error', (err, msg) => {
    this.queueHandler.handle(new errs.BrokerError(err, msg.message))
  })

  /* istanbul ignore next */
  this.rsmq.on('ready', () => {
    let startText = '\n\n'
    startText += '  ----------------------------\n'
    startText += "  Started 'DADI Queue'\n"
    startText += '  ----------------------------\n'
    startText += '  Server:      '.green + this.rsmq.config.host + ':' + this.rsmq.config.port + '\n'
    startText += '  Queue:       '.green + this.rsmq.queuename + '\n'
    startText += '  ----------------------------\n'

    startText += '\n  Copyright ' + String.fromCharCode(169) + ' 2016-' + new Date().getFullYear() + ' DADI+ Limited (https://dadi.tech)'.white + '\n'

    console.log(startText)
  })

  return this.rsmq.start()
}

/**
 * Process the response from the QueueHandler
 * @param {object} req - the message request
 * @param {string} err - an error message
 */
Broker.prototype.processResponse = function (req, err) {
  let queueError

  if (err) {
    queueError = new errs.WorkerError(err, req.message)
  }

  if (err && !req.retries) {
    queueError = new errs.ExceededError(req.message)
  }

  if (!req.address.length) {
    queueError = new errs.InvalidError(req.message)
  }

  if (Date.now() / 1000 > req.timeout) {
    queueError = new errs.TimeoutError(req.message)
  }

  if (queueError) {
    this.queueHandler.handle(queueError)
  }

  return !err || !req.retries
}

/**
 * Initialise the RSMQ service
 * @param {object} options - the set of configuration options loaded from the configuration file
 * @returns {object} - the RSMQ instance
 */
Broker.prototype.initialiseQueue = function (options) {
  /* istanbul ignore next */
  return new Rsmq(options.queue)
}

/**
 * Initialise the Broker's throttle
 * @param {object} options - the set of configuration options loaded from the configuration file
 * @returns {Throttle} - the Throttle instance
 */
Broker.prototype.initialiseThrottle = function (options) {
  return new Throttle(options.throttle, (start, stop) => {
    if (start) {
      this.rsmq.start()
    }

    if (stop) {
      this.rsmq.stop()
    }
  })
}

module.exports = Broker
