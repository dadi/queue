const conf = require('./config')
const errs = require('./errors')
const Rsmq = require('rsmq-worker')
const Throttle = require('./throttle')

/*
 * Message Broker -
 * Polls the queue server for messages, builds requests
 * for the app and handles errors
 */
module.exports = function broker (app) {
  // get config options
  var opts = conf.get('broker')
  
  // instantiate message queue
  var rsmq = new Rsmq(opts.queue)

  // instantiate throttle
  var throttle = Throttle(opts.throttle, (start, stop) => {
    if (start) rsmq.start()
    if (stop) rsmq.stop()
  })
  
  // message received
  rsmq.on('message', (msg, next) => {
    throttle.plus()
    next(false) // next message but don't delete
  })
  
  // message data received
  rsmq.on('data', (msg) => {
    // build request
    var req = {
      message: msg.message,
      address: [],
      data: null,
      retries: opts.retries - msg.rc,
      timeout: new Date(),
      age: new Date(),
      sent: new Date(msg.sent)
    }
    req.timeout.setSeconds(req.timeout.getSeconds() + opts.timeout)
    req.age.setSeconds(req.age.getSeconds() + msg.sent)
        
    // call the app and delete message on success
    app(null, req, (err) => {
      if (done(err)) rsmq.del(msg.id)
    })
    
    // done if no error and no retries remaining
    function done (err) {
      if (err) app(new errs.WorkerError(err, req.message))
      if (err && !req.retries) app(new errs.ExceededError(req.message))
      if (!req.address.length) app(new errs.InvalidError(req.message))
      if (new Date() > req.timeout) app(new errs.TimeoutError(req.message))
      return !err || !req.retries
    }
  })
    
  // queue error
  rsmq.on('error', (err, msg) => {
    app(new errs.BrokerError(err.message, msg.message))
  })
  
  // message deleted
  rsmq.on('deleted', () => throttle.minus())
  
  // start listening
  return rsmq.start()
}