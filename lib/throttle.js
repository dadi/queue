/**
* Throttle
*/

/**
 * @constructor
 * @classdesc Stops the message broker when the message queue length reaches it's maximum, and restarts it when the length falls below the maximum
 * @param {Object} options - options object which contains worker and queue configuration
 * @param {function} engine - a callback function accepting two Boolean arguments, `start` and `stop`
 */
var Throttle = function (options, engine) {
  this.engine = engine
  this.workers = {
    limit: options.workers,
    count: 0
  }
  this.queue = {
    unit: options.queue.unit,
    value: options.queue.value,
    history: []
  }
}

/**
 * Adjusts the internal message queue length and starts or stops the Broker
 * @param {number} amt - either `1` or `-1`, depending on whether `more()` or `less()` was called
 */
Throttle.prototype.adjustWorkerCount = function (amt) {
  var adj = this.workers.count + amt

  // if either side of tipping point, call the supplied engine
  // function which can start or stop the Broker
  if (adj === this.workers.limit || this.workers.count === this.workers.limit) {
    this.engine(amt < 0, amt > 0)
  }

  if (adj >= 0 && adj <= this.workers.limit) {
    this.workers.count += amt
  }
}

/**
 * Subtracts `1` from the message queue length
 */
Throttle.prototype.decreaseWorkerCount = function () {
  this.adjustWorkerCount(-1)
}

/**
 * Adds `1` to the message queue length
 */
Throttle.prototype.increaseWorkerCount = function () {
  this.adjustWorkerCount(1)
}

/**
 * Decide whether or not to process a queue message based on the throttling
 * @param {function} failure - called if throttle limits exceeded
 * @param {function} success - called if throttle limits have not been exceeded
 */
Throttle.prototype.throttleQueueMessage = function (failure, success) {
  // zero means disabled, so no throttling
  if (this.queue.value === 0) {
    return success()
  }

  // first we prune our queue history
  this.pruneQueueHistory()

  // then, if we have space, we allow the message and log it
  if (this.queue.history.length < this.queue.value) {
    this.queue.history.push(Date.now())
    success()
  } else {
    failure()
  }
}

/**
 * Prunes the queue history of any timestamps that are older than throttle limits
 */
Throttle.prototype.pruneQueueHistory = function () {
  var modifier = 0
  if (this.queue.unit === 'second') modifier = 1000
  else if (this.queue.unit === 'minute') modifier = 60 * 1000
  else if (this.queue.unit === 'hour') modifier = 60 * 60 * 1000
  else if (this.queue.unit === 'day') modifier = 24 * 60 * 60 * 1000

  var cutoffTime = Date.now() - (this.queue.value * modifier)
  for (var i = this.queue.history.length - 1; i >= 0; i--) {
    if (cutoffTime - this.queue.history[i] > 0) {
      this.queue.history.pop()
    }
  }
}

module.exports = function (options, engine) {
  return new Throttle(options, engine)
}
