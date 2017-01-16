'use strict'

const conf = require('../config')
const errs = require('./errors')
const Rsmq = require('rsmq-worker')
const Throttle = require('./throttle')

/**
 * Message Broker
 * Polls the queue server for messages, builds requests
 * for the app and handles errors
 * @param {function} app - the function to call when a message is received
 */
var Broker = function (app) {
  // get config options
  var opts = conf.get('broker')

  // instantiate message queue
  this.rsmq = new Rsmq(opts.queue)

  // instantiate throttle
  var throttle = new Throttle(opts.throttle, (start, stop) => {
    if (start) {
      this.rsmq.start()
    }

    if (stop) {
      this.rsmq.stop()
    }
  })

  // message received
  this.rsmq.on('message', (msg, next) => {
    throttle.more()
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
    console.log('Broker calling app')
    app.handle(null, req, (err) => {
      console.log('response from app')
      if (processResponse(req, err)) {
        this.rsmq.del(msg.id)
      }

      throttle.less()
    })

    // done if no error and no retries remaining
    function processResponse (req, err) {
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
        app.handle(queueError)
      }

      return !err || !req.retries
    }
  })

  // queue error
  this.rsmq.on('error', (err, msg) => {
    console.log(err)
    app(new errs.BrokerError(err, msg.message))
  })

  // start listening
  return this.rsmq.start()
}

module.exports = function (app) {
  return new Broker(app)
}
