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
      var throttle = new Throttle(20, function(start, stop) {})
      throttle.max.should.eql(20)
      throttle.val.should.eql(0)

      done()
    })
  })

  describe('less', function () {
    it('should call adjust with the specified parameter', function(done) {
      var throttle = new Throttle(20, function(start, stop) {})

      var spy = sinon.spy(throttle, 'adjust')

      throttle.less()
      spy.restore()

      spy.called.should.eql(true)
      spy.firstCall.args[0].should.eql(-1)

      done()
    })
  })

  describe('more', function () {
    it('should call adjust with the specified parameter', function(done) {
      var throttle = new Throttle(20, function(start, stop) {})

      var spy = sinon.spy(throttle, 'adjust')

      throttle.more()
      spy.restore()

      spy.called.should.eql(true)
      spy.firstCall.args[0].should.eql(1)

      done()
    })
  })

  describe('adjust', function () {
    it('should update the internal value when the adjustment is greater than 0 and less than max', function(done) {
      var throttle = new Throttle(20, function(start, stop) {})

      throttle.adjust(1)
      throttle.val.should.eql(1)

      done()
    })

    it('should fire the engine callback with STOP if the internal value equals the max value', function(done) {
      var engine = function (start, stop) {
        start.should.eql(false)
        stop.should.eql(true)
        done()
      }

      var throttle = new Throttle(20, engine)

      throttle.adjust(20)
    })

    it('should fire the engine callback with START if the adjustment value equals the max value and we throttled back', function(done) {
      var engine = function (start, stop) {
        start.should.eql(true)
        stop.should.eql(false)
        done()
      }

      var throttle = new Throttle(20, engine)
      throttle.val = 21

      throttle.adjust(-1)
    })
  })
})