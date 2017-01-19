/**
* Throttle
*/

/**
 * @constructor
 * @classdesc Stops the message broker when the message queue length reaches it's maximum, and restarts it when the length falls below the maximum
 * @param {number} max - the maximum number of queue messages to process at any one time
 * @param {function} engine - a callback function accepting two Boolean arguments, `start` and `stop`
 */
var Throttle = function (max, engine) {
  this.max = max
  this.engine = engine
  this.val = 0
}

/**
 * Adjusts the internal message queue length and starts or stops the Broker
 * @param {number} amt - either `1` or `-1`, depending on whether `more()` or `less()` was called
 */
Throttle.prototype.adjust = function (amt) {
  var adj = this.val + amt

  // if either side of tipping point, call the supplied engine
  // function which can start or stop the Broker
  if (adj === this.max || this.val === this.max) {
    this.engine(amt < 0, amt > 0)
  }

  if (adj >= 0 && adj <= this.max) {
    this.val += amt
  }
}

/**
 * Subtracts `1` from the message queue length
 */
Throttle.prototype.less = function () {
  this.adjust(-1)
}

/**
 * Adds `1` to the message queue length
 */
Throttle.prototype.more = function () {
  this.adjust(1)
}

module.exports = function (max, engine) {
  return new Throttle(max, engine)
}
