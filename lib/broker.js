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
    throttle.more()
    next(false) // next message but don't delete
  })
  
  // message data received
  rsmq.on('data', (msg) => {
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
    app(null, req, (err) => {
      if (done(err)) rsmq.del(msg.id)
      throttle.less()
    })
    
    // done if no error and no retries remaining
    function done (err) {
      if (err) app(new errs.WorkerError(err, req.message))
      if (err && !req.retries) app(new errs.ExceededError(req.message))
      if (!req.address.length) app(new errs.InvalidError(req.message))
      if (Date.now()/1000 > req.timeout) app(new errs.TimeoutError(req.message))
      return !err || !req.retries
    }
  })
    
  // queue error
  rsmq.on('error', (err, msg) => {
    app(new errs.BrokerError(err, msg.message))
  })
  
  // start listening
  return rsmq.start()
}