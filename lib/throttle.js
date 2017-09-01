'use strict'

/**
* Throttle
*/

/**
 * @constructor
 * @classdesc Stops the message broker when the message queue length reaches it's maximum, and restarts it when the length falls below the maximum
 * @param {Object} options - options object which contains worker and queue configuration
 * @param {function} engine - a callback function accepting two Boolean arguments, `start` and `stop`
 */
const Throttle = function (options, engine) {
  this.engine = engine
  this.messages = options.messages
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
  const adj = this.workers.count + amt

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
Throttle.prototype.throttleQueueMessage = function (message, failure, success) {
  const limits = message && this.findMessageLimits(message) || this.queue

  if (limits.value === 0) {
    return success()
  }

  this.pruneQueueHistory(limits)

  if (this.throttleLimitApplies(limits)) {
    this.pushTimestampToQueueHistory(limits)
    success()
  } else {
    failure(limits)
  }
}

/**
 * Checks whether there are any message specific throttle limits for this message
 * @param {object} message - specific message being processed
 * @returns message specific throttle limits or null
 */
Throttle.prototype.findMessageLimits = function (messageObject) {
  for (let i = 0; i < this.messages.length; i++) {
    const re = new RegExp(this.messages[i].regex, this.messages[i].regexOpts)

    if (re.test(messageObject.message)) {
      return this.messages[i]
    }
  }
}

/**
 * Checks whether the throttle for the queue limit passed in should apply
 * @param {object} limits - the throttle limits object for the message being processed
 * @returns boolean
 */
Throttle.prototype.throttleLimitApplies = function (limits) {
  if (!limits.history) {
    limits.history = []
  }

  return limits.history.length < limits.value
}

/**
 * Keeps track of the message being processed on the specific message limit object
 * @param {object} limits - the throttle limits object for the message being processed
 */
Throttle.prototype.pushTimestampToQueueHistory = function (limits) {
  if (!limits.history) {
    limits.history = []
  }

  limits.history.push(Date.now())
}

/**
 * Prunes the queue history of any timestamps that are older than specific message limit object
 * * @param {object} limits - the throttle limits object for the message being processed
 */
Throttle.prototype.pruneQueueHistory = function (limits) {
  if (!limits.history) {
    limits.history = []
    return
  }

  let modifier = 0

  if (limits.unit === 'second') modifier = 1000
  else if (limits.unit === 'minute') modifier = 60 * 1000
  else if (limits.unit === 'five-minute') modifier = 5 * 60 * 1000
  else if (limits.unit === 'quarter-hour') modifier = 15 * 60 * 1000
  else if (limits.unit === 'half-hour') modifier = 30 * 60 * 1000
  else if (limits.unit === 'hour') modifier = 60 * 60 * 1000
  else if (limits.unit === 'day') modifier = 24 * 60 * 60 * 1000

  const cutoffTime = Date.now() - (limits.value * modifier)

  for (let i = limits.history.length - 1; i >= 0; i--) {
    if (cutoffTime - limits.history[i] > 0) {
      limits.history.pop()
    }
  }
}

module.exports = function (options, engine) {
  return new Throttle(options, engine)
}
