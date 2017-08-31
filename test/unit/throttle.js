var fs = require('fs')
var path = require('path')
var should = require('should')
var redis = require('redis')
var sinon = require('sinon')

var config = require(path.join(__dirname, '../../config'))
var Broker = require(path.join(__dirname, '../../lib/broker'))
var Throttle = require(path.join(__dirname, '../../lib/throttle'))

describe('Throttle', function (done) {
  beforeEach(function (done) {
    done()
  })

  describe('constructor', function () {
    it('should accept parameters and set defaults', function(done) {
      var throttleOpts = config.get('broker.throttle')
      throttleOpts.workers = 20
      
      var throttle = new Throttle(throttleOpts, function(start, stop) {})
      throttle.workers.limit.should.eql(throttleOpts.workers)
      throttle.workers.count.should.eql(0)

      done()
    })
  })

  describe('decreaseWorkerCount', function () {
    it('should call adjustWorkerCount with the specified parameter', function(done) {
      var throttleOpts = config.get('broker.throttle')
      throttleOpts.workers = 20
      
      var throttle = new Throttle(throttleOpts, function(start, stop) {})
      var spy = sinon.spy(throttle, 'adjustWorkerCount')

      throttle.decreaseWorkerCount()
      spy.restore()

      spy.called.should.eql(true)
      spy.firstCall.args[0].should.eql(-1)

      done()
    })
  })

  describe('increaseWorkerCount', function () {
    it('should call adjustWorkerCount with the specified parameter', function(done) {
      var throttleOpts = config.get('broker.throttle')
      throttleOpts.workers = 20
      
      var throttle = new Throttle(throttleOpts, function(start, stop) {})
      var spy = sinon.spy(throttle, 'adjustWorkerCount')

      throttle.increaseWorkerCount()
      spy.restore()

      spy.called.should.eql(true)
      spy.firstCall.args[0].should.eql(1)

      done()
    })
  })

  describe('adjustWorkerCount', function () {
    it('should update the internal value when the adjustment is greater than 0 and less than max', function(done) {
      var throttleOpts = config.get('broker.throttle')
      throttleOpts.workers = 20
      
      var throttle = new Throttle(throttleOpts, function(start, stop) {})

      throttle.adjustWorkerCount(1)
      throttle.workers.count.should.eql(1)

      done()
    })

    it('should fire the engine callback with STOP if the internal value equals the max value', function(done) {
      var engine = function (start, stop) {
        start.should.eql(false)
        stop.should.eql(true)
        done()
      }
      
      var throttleOpts = config.get('broker.throttle')
      throttleOpts.workers = 20

      var throttle = new Throttle(throttleOpts, engine)
      throttle.adjustWorkerCount(20)
    })

    it('should fire the engine callback with START if the adjustment value equals the max value and we throttled back', function(done) {
      var engine = function (start, stop) {
        start.should.eql(true)
        stop.should.eql(false)
        done()
      }

      var throttleOpts = config.get('broker.throttle')
      throttleOpts.workers = 20
      
      var throttle = new Throttle(throttleOpts, engine)
      throttle.workers.count = 21
      throttle.adjustWorkerCount(-1)
    })
  })
})