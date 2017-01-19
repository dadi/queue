'use strict'

/**
 * Message Broker
 */
const config = require('../config')
const errs = require('./errors')
const Rsmq = require('rsmq-worker')
const Throttle = require('./throttle')

/**
 * @constructor
 * @classdesc Polls the queue server for messages, builds requests
 * for the app and handles errors
 * @param {QueueHandler} queueHandler - the function to call when a message is received
 */
var Broker = function (queueHandler) {
  var opts = config.get('broker')

  this.queueHandler = queueHandler
  this.rsmq = this.initialiseQueue(opts)
  this.throttle = this.initialiseThrottle(opts)

  // message received
  this.rsmq.on('message', (msg, next) => {
    this.throttle.more()
    next(false) // next message but don't delete
  })

  // message data received
  this.rsmq.on('data', (msg) => {
    // build request
    var now = Date.now() / 1000

    var req = {
      message: msg.message,
      address: [],
      data: null,
      retries: opts.retries - msg.rc,
      timeout: now + opts.timeout,
      age: now + msg.sent,
      sent: msg.sent
    }

    // call the app and delete message on success
    this.queueHandler.handle(null, req, (err) => {
      if (this.processResponse(req, err)) {
        this.rsmq.del(msg.id)
      }

      this.throttle.less()
    })
  })

  // queue error
  this.rsmq.on('error', (err, msg) => {
    this.queueHandler.handle(new errs.BrokerError(err, msg.message))
  })

  // start listening
  return this.rsmq.start()
}

/**
 *  done if no error and no retries remaining
 */
Broker.prototype.processResponse = function (req, err) {
  var queueError

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

Broker.prototype.initialiseQueue = function (options) {
  return new Rsmq(options.queue)
}

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
