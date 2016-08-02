const logger = require('./logger')
const broker = require('./broker')
const router = require('./router')

/*
 * Main App -
 * Starts the message broker, delegates messages to
 * workers via the router, and handles errors
 */
module.exports = function app () {
  var queue = broker((err, req, done) => {
    if (err) error(err)
    else router(req, queue, done)
  })
  
  function error (err) {
    var level = err.level || 'error'
    logger[level](err.toJson())
  }
}