var path = require('path')
var should = require('should')
var sinon = require('sinon')
var util = require('util')
var EventEmitter = require('events')

var config = require(path.join(__dirname, '../../config'))
var Broker = require(path.join(__dirname, '../../lib/broker'))
var Router = require(path.join(__dirname, '../../lib/router'))
var Throttle = require(path.join(__dirname, '../../lib/throttle'))
var QueueHandler = require(path.join(__dirname, '../../lib/queue-handler'))

var FakeRsmq = function() {
  this.del = function() {

  }

  this.start = function() {

  }

  this.stop = function() {

  }
}

var fakeRsmq
var queueHandler

util.inherits(FakeRsmq, EventEmitter)

describe('Broker', function (done) {
  beforeEach(function (done) {
    config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

    fakeRsmq = new FakeRsmq()
    sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)

    done()
  })

  afterEach(function (done) {
    Broker.prototype.initialiseQueue.restore()
    done()
  })

  describe('Worker', function () {
    it('should receive additional data passed in the message request', function (done) {
      queueHandler = new QueueHandler()

      var msg = {
        message: 'sms:send-reminder:123456',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      var spy = sinon.spy(Router.prototype, 'getWorkerData')

      fakeRsmq.emit('data', msg)

      spy.restore()
      spy.called.should.eql(true)
      var returnValue = spy.firstCall.returnValue
      returnValue.should.eql('123456')
      done()
    })
  })

  describe('Queue', function () {
    it('should be started by throttle', function(done) {
      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      var queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          done()
        }
      })

      var spy = sinon.spy(fakeRsmq, 'start')

      // change the message count in the throttle
      queueHandler.queue.throttle.workers.count = 5

      fakeRsmq.emit('data', msg)

      spy.restore()
      handlerStub.restore()

      spy.calledOnce.should.eql(true)
      done()
    })

    it('should be stopped by throttle', function(done) {
      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      var queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          done()
        }
      })

      var spy = sinon.spy(fakeRsmq, 'stop')

      // change the message count in the throttle
      queueHandler.queue.throttle.workers.count = 5

      fakeRsmq.emit('message', msg, function() {

      })

      spy.restore()
      handlerStub.restore()

      spy.calledOnce.should.eql(true)
      done()
    })
    
    it('should not throttle messages processed if limit is zero', function (done) {
      var messagesProcessed = []
      var queueHandler = new QueueHandler()
      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          if (messagesProcessed.indexOf(req.message) === -1) {
            messagesProcessed.push(req.message)
          }
          req.address = 'hello'
          done()
        }
      })
      
      queueHandler.queue.throttle.queue.value = 0
      
      for (var i = 0; i < 5; i++) {
        fakeRsmq.emit('data', {
          message: 'MSG-' + i,
          address: 'hello',
          sent: Date.now(),
          rc: 1
        })
      }
      
      handlerStub.restore()
      messagesProcessed.length.should.eql(5)
      
      done()
    })
    
    it('should throttle messages processed if limit is exceeded', function (done) {
      var messagesProcessed = []
      var queueHandler = new QueueHandler()
      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          if (messagesProcessed.indexOf(req.message) === -1) {
            messagesProcessed.push(req.message)
          }
          req.address = 'hello'
          done()
        }
      })
      
      queueHandler.queue.throttle.queue.unit = 'minute'
      queueHandler.queue.throttle.queue.value = 10
      
      for (var i = 0; i < 20; i++) {
        fakeRsmq.emit('data', {
          message: 'MSG-' + i,
          address: 'hello',
          sent: Date.now(),
          rc: 1
        })
      }
      
      handlerStub.restore()
      messagesProcessed.length.should.eql(10)
      
      done()
    })
    
    it('should throttle messages processed over time', function (done) {
      this.timeout(3000)
      
      var emitCount = 0
      var messagesProcessed = []
      var queueHandler = new QueueHandler()
      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          if (messagesProcessed.indexOf(req.message) === -1) {
            messagesProcessed.push(req.message)
          }
          req.address = 'hello'
          done()
        }
      })
      
      queueHandler.queue.throttle.queue.unit = 'second'
      queueHandler.queue.throttle.queue.value = 1
      
      function emitAndWait() {
        fakeRsmq.emit('data', {
          message: 'MSG-' + emitCount,
          address: 'hello',
          sent: Date.now(),
          rc: 1
        })
        emitCount++
        
        if (emitCount < 10) {
          setTimeout(emitAndWait, 250)
        } else {
          handlerStub.restore()
          messagesProcessed.length.should.eql(3)
          done()
        }
      }
      
      emitAndWait()
    })
    
    it('should throttle specific messages processed if limit is exceeded', function (done) {
      var messagesProcessed = []
      var queueHandler = new QueueHandler()
      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          if (messagesProcessed.indexOf(req.message) === -1) {
            messagesProcessed.push(req.message)
          }
          req.address = 'hello'
          done()
        }
      })
      
      // add a message-specific limit of 5/second for 
      // messages beginning with "fps-"
      queueHandler.queue.throttle.messages.push({
        name: 'five-per-second',
        regex: 'fps-.*',
        regexOpts: 'i',
        unit: 'second',
        value: 5
      })
      
      // add a message-specific limit of 1/minute for 
      // messages beginning with "opm-"
      queueHandler.queue.throttle.messages.push({
        name: 'one-per-minute',
        regex: 'opm-.*',
        regexOpts: 'i',
        unit: 'minute',
        value: 1
      })
      
      // emit 10 messages starting with "fps-"
      for (var i = 0; i < 10; i++) {
        fakeRsmq.emit('data', {
          message: 'fps-' + i,
          address: 'hello',
          sent: Date.now(),
          rc: 1
        })
      }
      
      // emit 5 messages starting with "ops-"
      for (var i = 0; i < 5; i++) {
        fakeRsmq.emit('data', {
          message: 'opm-' + i,
          address: 'hello',
          sent: Date.now(),
          rc: 1
        })
      }
      
      handlerStub.restore()
      
      // we should only see 6 – five for fps, and one for opm
      messagesProcessed.length.should.eql(6)
      
      done()
    })

    it('should handle error events, passing the error to the QueueHandler', function(done) {
      var msg = {
        message: 'XXX'
      }

      var queueHandler = new QueueHandler()
      var spy = sinon.spy(QueueHandler.prototype, 'handle')

      fakeRsmq.emit('error', 'ERROR', msg)

      spy.restore()

      spy.calledOnce.should.eql(true)
      var arg = spy.firstCall.args[0]
      arg.name.should.eql('BrokerError')
      arg.error.should.eql('ERROR')

      done()
    })

    it('should handle data events, passing the message to the QueueHandler', function(done) {
      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      var queueHandler = new QueueHandler()
      var spy = sinon.spy(QueueHandler.prototype, 'handle')

      fakeRsmq.emit('data', msg)

      spy.restore()

      spy.called.should.eql(true)
      var args = spy.firstCall.args
      should.not.exist(args[0])
      done()
    })

    it('should delete a message if it is processed successfully', function(done) {
      var msg = {
        id: 'hello',
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      var queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          done()
        }
      })

      var spy = sinon.spy(fakeRsmq, 'del')

      fakeRsmq.emit('data', msg)

      spy.restore()
      handlerStub.restore()

      spy.called.should.eql(true)
      var args = spy.firstCall.args
      args[0].should.eql(msg.id)
      done()
    })
  })

  describe('processResponse', function () {
    it('should create a WorkerError when an error is returned by the QueueHandler', function (done) {
      queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          done('ERROR')
        }
      })

      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      fakeRsmq.emit('data', msg)

      handlerStub.restore()
      handlerStub.calledTwice.should.eql(true)
      var arg = handlerStub.secondCall.args[0]
      arg.name.should.eql('WorkerError')
      arg.error.should.eql('ERROR')
      done()
    })

    it('should create an ExceededError when an error is returned by the QueueHandler and there are no retries left', function (done) {
      queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          delete req.retries
          done('ERROR')
        }
      })

      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      fakeRsmq.emit('data', msg)

      handlerStub.restore()
      handlerStub.calledTwice.should.eql(true)
      var arg = handlerStub.secondCall.args[0]
      arg.name.should.eql('ExceededError')
      done()
    })

    it('should create an InvalidError when an returned message has no address', function (done) {
      queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = []
          done('ERROR')
        }
      })

      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      fakeRsmq.emit('data', msg)

      handlerStub.restore()
      handlerStub.calledTwice.should.eql(true)
      var arg = handlerStub.secondCall.args[0]
      arg.name.should.eql('InvalidError')
      done()
    })

    it('should create a TimeoutError when a message timeout has passed', function (done) {
      queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          req.timeout = 1000
          done('ERROR')
        }
      })

      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      fakeRsmq.emit('data', msg)

      handlerStub.restore()
      handlerStub.calledTwice.should.eql(true)
      var arg = handlerStub.secondCall.args[0]
      arg.name.should.eql('TimeoutError')
      done()
    })

    it('should return true if no error', function (done) {
      queueHandler = new QueueHandler()

      var handlerStub = sinon.stub(QueueHandler.prototype, 'handle', function (err, req, done) {
        if (typeof done === 'function') {
          req.address = 'hello'
          done()
        }
      })

      var msg = {
        message: 'XXX',
        address: 'hello',
        sent: Date.now(),
        rc: 1
      }

      var spy = sinon.spy(Broker.prototype, 'processResponse')

      fakeRsmq.emit('data', msg)

      spy.restore()
      spy.calledOnce.should.eql(true)
      spy.firstCall.returnValue.should.eql(true)
      done()
    })
  })
})