'use strict'

var config = require('../config')
var logger = require('@dadi/logger')
logger.init(config.get('logging'), null, config.get('env'))

module.exports = logger
