'use strict'

/**
 * Workers
 */
var fs = require('fs')
var path = require('path')

/**
 * @constructor
 * @classdesc Loads worker functions into an object literal
 */
var Workers = function () {

}

/**
 * @param {string} root - xx
 * @returns {Array} workers - xx
 */
Workers.prototype.load = function (root) {
  this.workers = {}

  // files must be read before directories so that deeper levels can be
  // assigned as properties to the initial worker functions
  fs.readdirSync(root).forEach(fileName => this.loadPath(root, fileName, 'file'))
  fs.readdirSync(root).forEach(fileName => this.loadPath(root, fileName, 'dir'))

  return this.workers
}

/**
 * @param {string} root - xx
 * @param {string} fileName - xx
 * @param {string} type - xx
 */
Workers.prototype.loadPath = function (root, fileName, type) {
  var filePath = path.join(root, fileName)
  var isDir = fs.lstatSync(filePath).isDirectory()
  var basename = path.basename(filePath, '.js')

  if (type === 'file' && path.extname(filePath) === '.js') {
    this.workers[basename] = require(path.resolve(filePath))
  }

  if (type === 'dir' && isDir) { // recurse
    this.workers[basename] = Object.assign(this.workers[basename] || {}, this.load(filePath))
  }
}

module.exports = function () {
  return new Workers()
}
