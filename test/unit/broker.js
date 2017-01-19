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
    done()
  })

  describe('Queue', function () {
    it('should be started by throttle', function(done) {
      fakeRsmq = new FakeRsmq()

      sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)

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
      queueHandler.queue.throttle.val = 5

      fakeRsmq.emit('data', msg)

      spy.restore()
      handlerStub.restore()
      Broker.prototype.initialiseQueue.restore()

      spy.calledOnce.should.eql(true)
      done()
    })

    it('should be stopped by throttle', function(done) {
      fakeRsmq = new FakeRsmq()

      sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)

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
      queueHandler.queue.throttle.val = 5

      fakeRsmq.emit('message', msg, function() {
        
      })

      spy.restore()
      handlerStub.restore()
      Broker.prototype.initialiseQueue.restore()

      spy.calledOnce.should.eql(true)
      done()
    })

    it('should handle error events, passing the error to the QueueHandler', function(done) {
      var msg = {
        message: 'XXX'
      }

      fakeRsmq = new FakeRsmq()
      sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)

      var queueHandler = new QueueHandler()
      var spy = sinon.spy(QueueHandler.prototype, 'handle')

      fakeRsmq.emit('error', 'ERROR', msg)

      spy.restore()
      Broker.prototype.initialiseQueue.restore()

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

      fakeRsmq = new FakeRsmq()
      sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)

      var queueHandler = new QueueHandler()
      var spy = sinon.spy(QueueHandler.prototype, 'handle')

      fakeRsmq.emit('data', msg)

      spy.restore()
      Broker.prototype.initialiseQueue.restore()

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

      fakeRsmq = new FakeRsmq()
      sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)

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
      Broker.prototype.initialiseQueue.restore()

      spy.called.should.eql(true)
      var args = spy.firstCall.args
      args[0].should.eql(msg.id)
      done()
    })
  })

  describe('processResponse', function () {
    beforeEach(function (done) {
      fakeRsmq = new FakeRsmq()
      sinon.stub(Broker.prototype, 'initialiseQueue').returns(fakeRsmq)
      done()
    })

    afterEach(function (done) {
      Broker.prototype.initialiseQueue.restore()
      done()
    })

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