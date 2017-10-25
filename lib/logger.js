'use strict'

const config = require('../config')
const logger = require('@dadi/logger')
logger.init(config.get('logging'), null, config.get('env'))

module.exports = logger
