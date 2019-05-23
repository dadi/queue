'use strict'

const chokidar = require('chokidar')
const config = require('../config')
const fs = require('fs')
const mkdirp = require('mkdirp')

// Ensure the workers folder exists
mkdirp(config.get('workers.path'), (err, made) => {
  if (err) {
    console.log(err)
  }

  if (made) {
    console.log('\nCreated workers folder at ' + made + '\n')
  }
})

/**
 * Workers
 */

/**
 * @constructor
 * @classdesc Loads worker functions into an object literal
 */
const Workers = function () {
  this.workers = {}
  this.workerPath = config.get('workers.path')

  // Load all workers from the configured worker path
  this.load(this.workerPath, this.workers)

  // Start watching the worker path for new/changed files
  const watcher = chokidar.watch(this.workerPath, {
    ignored: /(^|[/\\])\../,
    persistent: true
  })

  watcher.on('all', (event, path) => {
    if (['add', 'change', 'unlink'].includes(event)) {
      this.workers = {}
      this.load(this.workerPath, this.workers)
    }
  })
}

/**
 * @param {string} path - the current worker path to process
 * @param {Object} obj - the object to populate with worker functions
 */
Workers.prototype.load = function (path, obj) {
  const dir = fs.readdirSync(path)

  for (var i = 0; i < dir.length; i++) {
    const name = dir[i]
    const target = path + '/' + name
    const stats = fs.statSync(target)

    if (stats.isFile()) {
      if (name.slice(-3) === '.js') {
        delete require.cache[target]
        obj[name.slice(0, -3)] = require(target)
      }
    } else if (stats.isDirectory()) {
      obj[name] = {}
      this.load(target, obj[name])
    }
  }
}

Workers.prototype.getWorkers = function () {
  return this.workers
}

module.exports = function () {
  return new Workers()
}
