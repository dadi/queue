const conf = require('./config')
const fs = require('fs')
const path = require('path')

/*
 * Loads worker functions into an object literal
 */
function loader (root) {
  var workers = {}

  // files must be read before directories so that deeper levels can be
  // assigned as properties to the initial worker functions
  fs.readdirSync(root).forEach(fileName => load(fileName, 'file'))
  fs.readdirSync(root).forEach(fileName => load(fileName, 'dir'))
  
  function load (fileName, type) {
    var filePath = path.join(root, fileName)
    var isDir = fs.lstatSync(filePath).isDirectory()
    var basename = path.basename(filePath, '.js')
    
    if (type === 'file' && path.extname(filePath) === '.js') {
      workers[basename] = require(path.resolve(filePath))
    } 
    if (type === 'dir' && isDir) { // recurse
      workers[basename] = Object.assign(workers[basename] || {}, loader(filePath))
    }
  }
  return workers
}

module.exports = loader(conf.get('workers.path'))