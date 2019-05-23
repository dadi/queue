var fakeredis = require('fakeredis')
var fs = require('fs')
var path = require('path')
var should = require('should')
var redis = require('redis')
var sinon = require('sinon')

var config = require(path.join(__dirname, '../../config'))
var Broker = require(path.join(__dirname, '../../lib/broker'))
var Router = require(path.join(__dirname, '../../lib/router'))

let newWorkerPath

describe('Router', function (done) {
  this.timeout(15000)

  describe('initialisation', function () {
    afterEach(done => {
      const cleanup = function (path) {
        fs.unlinkSync(path)
      }

      if (newWorkerPath) cleanup(newWorkerPath)
      done()
    })

    it('should load workers from the configured path', function (done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      const router = new Router()
      const workers = router.workerManager.getWorkers()

      Object.keys(workers).length.should.eql(2)
      should.exist(workers['hello-world'])
      should.exist(workers['sms'])
      should.exist(workers['sms']['send-reminder'])

      done()
    })

    it('should reload workers when a worker is added', function (done) {
      const workersPath = path.resolve(path.join(__dirname, '../workers'))
      config.set('workers.path', workersPath)

      const router = new Router()
      let workers = router.workerManager.getWorkers()

      Object.keys(workers).length.should.eql(2)
      should.exist(workers['hello-world'])
      should.exist(workers['sms'])
      should.exist(workers['sms']['send-reminder'])

      newWorkerPath = path.join(workersPath, 'new-worker.js')
      const newWorkerText = `
        module.exports = (req, queue, done) => {
          done('new worker')
        }`

      fs.writeFile(newWorkerPath, newWorkerText, err => {
        if (err) {
          done(err)
        }

        setTimeout(() => {
          workers = router.workerManager.getWorkers()

          Object.keys(workers).length.should.eql(3)
          should.exist(workers['hello-world'])
          should.exist(workers['sms'])
          should.exist(workers['sms']['send-reminder'])
          should.exist(workers['new-worker'])

          done()
        }, 2000)
      })
    })

    it('should reload workers when a worker is modified', function (done) {
      const workersPath = path.resolve(path.join(__dirname, '../workers'))
      config.set('workers.path', workersPath)

      const router = new Router()
      let workers = router.workerManager.getWorkers()

      Object.keys(workers).length.should.eql(2)
      should.exist(workers['hello-world'])
      should.exist(workers['sms'])
      should.exist(workers['sms']['send-reminder'])

      newWorkerPath = path.join(workersPath, 'new-worker.js')
      let newWorkerText = `module.exports = (req, queue, done) => {
  done('NEW WORKER - VERSION 1')
}`

      fs.writeFile(newWorkerPath, newWorkerText, err => {
        if (err) {
          return done(err)
        }

        setTimeout(() => {
          workers = router.workerManager.getWorkers()

          let worker = workers['new-worker']

          worker({}, null, function (response) {
            response.should.eql('NEW WORKER - VERSION 1')

            // Modify worker function
            newWorkerText = `module.exports = (req, queue, done) => {
              done('NEW WORKER - VERSION 2')
            }`

            fs.writeFile(newWorkerPath, newWorkerText, err => {
              if (err) {
                return done(err)
              }

              setTimeout(() => {
                workers = router.workerManager.getWorkers()

                worker = workers['new-worker']

                worker({}, null, function (response) {
                  response.should.eql('NEW WORKER - VERSION 2')

                  done()
                })
              }, 3000)
            })
          })
        }, 3000)
      })
    })
  })

  describe('route', function () {
    it('should callback if no workers match the message', function (done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      var req = {
        message: 'XXX'
      }

      var callback = function () {
        done()
      }

      var router = new Router()
      var worker = router.route(req, null, callback)
    })
  })

  describe('getWorker', function () {
    it('should return a worker that matches the message', function (done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      var req = {
        message: 'hello-world'
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.exist(worker)
      done()
    })

    it('should return null if no workers match the message', function (done) {
      config.set('workers.path', path.resolve(path.join(__dirname, '../workers')))

      var req = {
        message: 'xxx'
      }

      var router = new Router()
      var worker = router.getWorker(req)
      should.not.exist(worker)
      done()
    })

    it('should not decode an unencapsulated primitive base64 message', function (done) {
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

    it('should unpack an encapsulated primitive base64 message', function (done) {
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

    it('should not decode an unencapsulated json base64 message', function (done) {
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

    it('should unpack an encapsulated primitive base64 message', function (done) {
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
