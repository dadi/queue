/*
 * Message Throttle -
 * Stops the message broker when it hits max
 * Restarts when below max
 * Takes an 'engine' callback with (stop, start) params
 */
 module.exports = function Throttle (max, engine) {
  var val = 0

  this.more = function () { adjust(1) }
  this.less = function () { adjust(-1) }

  const adjust = function (amt) {
    var adj = val + amt
    if (adj === max || val === max) engine(amt < 0, amt > 0)
    if (adj >= 0 && adj <= max) val += amt
  }
  return this
}