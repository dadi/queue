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
    value: options.queue.value
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

module.exports = function (options, engine) {
  return new Throttle(options, engine)
}
