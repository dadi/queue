const QueueHandler = require('./lib/queue-handler')
module.exports.Config = require(__dirname + '/config')
module.exports = new QueueHandler()