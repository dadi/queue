'use strict'

const conf = require('../config')
const logger = require('@dadi/logger')
logger.init(conf.get('logging'), null, conf.get('env'))

module.exports = logger
