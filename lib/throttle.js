/*
 * Message Throttle -
 * Stops the message broker when it hits max
 * Restarts when below max
 * Takes an 'engine' callback with (stop, start) params
 */

var Throttle = function (max, engine) {
  this.max = max
  this.engine = engine
  this.val = 0
}

Throttle.prototype.adjust = function (amt) {
  var adj = this.val + amt

  // if either side of tipping point...
  if (adj === this.max || this.val === this.max) {
    this.engine(amt < 0, amt > 0)
  }

  if (adj >= 0 && adj <= this.max) {
    this.val += amt
  }
}

Throttle.prototype.less = function () {
  this.adjust(-1)
}

Throttle.prototype.more = function () {
  this.adjust(1)
}

module.exports = function (max, engine) {
  return new Throttle(max, engine)
}
