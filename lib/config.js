var convict = require('convict')

var conf = convict({
  env: {
    doc: "The applicaton environment",
    format: ["production", "development", "test"],
    default: "development",
    env: "NODE_ENV"
  },
  queue: {
    host: {
      doc: "The queue server host IP",
      format: "ipaddress",
      default: "127.0.0.1"
    },
    port: {
      doc: "The queue server port number",
      format: "port",
      default: 6379
    }
  },
  broker: {
    queue: {
      doc: "The queue name",
      format: String,
      default: "",
      arg: "queue"
    },
    interval: {
      doc: "The polling intervals, in seconds",
      format: Array,
      default: [ 0, 1, 5, 10 ]
    },
    retries: {
      doc: "The number of times a message will be retried after failing",
      format: Number,
      default: 10
    },
    timeout: {
      doc: "The number of seconds until a message is placed back on the queue",
      format: Number,
      default: 30
    },
    throttle: {
      doc: "The number of workers that should execute concurrently",
      format: Number,
      default: 5
    }
  },
  workers: {
    path: {
      doc: "The absolute or relative path to the directory for worker modules",
      format: String,
      default: "./workers"
    }
  },
  logging: {
    enabled: {
      doc: "Enable or disable logging",
      format: Boolean,
      default: false
    },
    level: {
      doc: "The minimum error level to be logged",
      format: String,
      default: "info"
    },
    path: {
      doc: "The absolute or relative path to the directory for log files",
      format: String,
      default: "./log"
    },
    filename: {
      doc: "The name to use for the log file, without extension",
      format: String,
      default: "error"
    },
    extension: {
      doc: "The extension to use for the log file",
      format: String,
      default: "log"
    },
    accessLog: {
      enabled: {
        doc: "Enable or disable access logging",
        format: Boolean,
        default: false
      },
    }
  }
})

var env = conf.get('env')
conf.loadFile('config/config.' + env + '.json')
conf.validate({ strict: true })

module.exports = conf