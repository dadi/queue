var fakeredis = require('fakeredis')
var fs = require('fs')
var path = require('path')
var should = require('should')
var redis = require('redis')
var sinon = require('sinon')

var config = require(path.join(__dirname, '../../config'))
var Broker = require(path.join(__dirname, '../../lib/broker'))
var Router = require(path.join(__dirname, '../../lib/router'))

describe('Router', function (done) {
  beforeEach(function (done) {
    done()
  })

  describe('route', function () {
    it('should callback if no workers match the message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      var req = {
        message: 'XXX'
      }

      var callback = function() {
        done()
      }

      var router = new Router()
      var worker = router.route(req, null, callback)
    })
  })

  describe('getWorker', function () {
    it('should return a worker that matches the message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      var req = {
        message: 'hello-world'
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.exist(worker)
      done()
    })

    it('should return null if no workers match the message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      var req = {
        message: 'xxx'
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.not.exist(worker)
      done()
    })

    it('should not decode an unencapsulated primitive base64 message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      // hello world
      // aGVsbG8gd29ybGQ=

      var req = {
        message: 'hello-world:aGVsbG8gd29ybGQ='
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.exist(req.data)
      req.data.should.equal('aGVsbG8gd29ybGQ=')
      done()
    })

    it('should unpack an encapsulated primitive base64 message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      // hello world
      // aGVsbG8gd29ybGQ=

      var req = {
        message: 'hello-world:[[aGVsbG8gd29ybGQ=]]'
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.exist(req.data)
      req.data.should.equal('hello world')
      done()
    })

    it('should not decode an unencapsulated json base64 message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      // { "message": "hello world" }
      // eyAibWVzc2FnZSI6ICJoZWxsbyB3b3JsZCIgfSA=

      var req = {
        message: 'hello-world:eyAibWVzc2FnZSI6ICJoZWxsbyB3b3JsZCIgfSA='
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.exist(req.data)
      req.data.should.equal('eyAibWVzc2FnZSI6ICJoZWxsbyB3b3JsZCIgfSA=')
      done()
    })

    it('should unpack an encapsulated primitive base64 message', function(done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      // { "message": "hello world" }
      // eyAibWVzc2FnZSI6ICJoZWxsbyB3b3JsZCIgfSA=

      var req = {
        message: 'hello-world:[[eyAibWVzc2FnZSI6ICJoZWxsbyB3b3JsZCIgfSA=]]'
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.exist(req.data)
      req.data.should.be.type('object')
      req.data.should.have.property('message', 'hello world')
      done()
    })
  })
})