/*
 * Error classes with custom messages and
 * `level` param for logging
 */
class CustomError extends Error {
  constructor (message, id) {
    super(message)
    this.level = 'error'
    this.id = id
  }
  toJson () {
    return {id: this.id, message: this.message}
  }
  toString () {
    var id = (this.id) ? `[${this.id}] ` : ''
    return id + this.message
  }
}

class BrokerError extends CustomError {}

class WorkerError extends CustomError {
  constructor (err, id) {
    function message () {
      if (err instanceof Error) return err.message
      if (typeof err === 'string') return err
      if (err.detail) return err.detail // DADI API error
      return JSON.stringify(err) // default case
    }
    super(message(), id)
  }
}

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