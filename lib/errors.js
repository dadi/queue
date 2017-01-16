'use strict'

/*
 * Error class with error level and message id
 */
class CustomError extends Error {
  constructor (message, id) {
    super(message)
    this.name = this.constructor.name
    this.level = 'error'
    this.id = id
  }
  toJSON () { return { id: this.id } }
}

/*
 * Error class to wrap a standard error, including the
 * error level, message id and original error
 */
class WrapperError extends CustomError {
  constructor (error, id) {
    super(error, id)
    this.error = error
  }
  toJSON () {
    return Object.assign(
      super.toJSON(), { err: this.error }
    )
  }
  toString () { return this.message }
}

class BrokerError extends WrapperError {}
class WorkerError extends WrapperError {}

/*
 * Custom warning classes
 */
class CustomWarning extends CustomError {
  constructor (message, id) {
    super(message, id)
    this.level = 'warn'
  }
}

class ExceededError extends CustomWarning {
  constructor (id) {
    super('Message attempts failed', id)
  }
}

class TimeoutError extends CustomWarning {
  constructor (id) {
    super('Message processing timeout', id)
  }
}

class InvalidError extends CustomWarning {
  constructor (id) {
    super('Invalid message signature', id)
  }
}

module.exports = {
  BrokerError,
  WorkerError,
  ExceededError,
  TimeoutError,
  InvalidError
}
