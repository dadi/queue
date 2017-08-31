const convict = require('convict')
const fs = require('fs')
const mkdirp = require('mkdirp')
const path = require('path')

const conf = convict({
  env: {
    doc: 'The applicaton environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  queue: {
    host: {
      doc: 'The queue server host IP',
      format: 'ipaddress',
      default: '127.0.0.1'
    },
    port: {
      doc: 'The queue server port number',
      format: 'port',
      default: 6379
    }
  },
  broker: {
    queue: {
      doc: 'The queue name',
      format: String,
      default: '',
      arg: 'queue'
    },
    interval: {
      doc: 'The polling intervals, in seconds',
      format: Array,
      default: [ 0, 1, 5, 10 ]
    },
    retries: {
      doc: 'The number of times a message will be retried after failing',
      format: Number,
      default: 10
    },
    timeout: {
      doc: 'The number of seconds until a message is placed back on the queue',
      format: Number,
      default: 30
    },
    throttle: {
      workers: {
        doc: 'The number of workers that should execute concurrently',
        format: Number,
        default: 5
      },
      queue: {
        unit: {
          doc: 'The unit of measurement used for queue throttling',
          format: ['second', 'minute', 'hour', 'day'],
          default: 'minute'
        },
        value: {
          doc: 'The value used for queue throttling. The rate will be limited to value/unit. Zero implies no limit.',
          format: Number,
          default: 0
        }
      },
      messages: {
        doc: 'Message specific throttle limits',
        format: '*',
        default: {}
      }
    }
  },
  workers: {
    path: {
      doc: 'The absolute or relative path to the directory for worker modules',
      format: String,
      default: './workers'
    }
  },
  logging: {
    enabled: {
      doc: 'Enable or disable logging',
      format: Boolean,
      default: false
    },
    level: {
      doc: 'The minimum error level to be logged',
      format: String,
      default: 'info'
    },
    path: {
      doc: 'The absolute or relative path to the directory for log files',
      format: String,
      default: './log'
    },
    filename: {
      doc: 'The name to use for the log file, without extension',
      format: String,
      default: 'error'
    },
    extension: {
      doc: 'The extension to use for the log file',
      format: String,
      default: 'log'
    },
    accessLog: {
      enabled: {
        doc: 'Enable or disable access logging',
        format: Boolean,
        default: false
      }
    }
  }
})

function loadConfig () {
  const configPath = path.join(process.cwd(), 'config/config.development.json')
  const configSamplePath = path.join(__dirname, 'config/config.development.json.sample')
  const sampleConfig = fs.readFileSync(configSamplePath, { encoding: 'utf-8'})

  try {
    var s = fs.readFileSync(configPath, { encoding: 'utf-8'})
  } catch (err) {
    if (err.code === 'ENOENT') {
      var made = mkdirp.sync(path.join(process.cwd(), 'config'))
      fs.writeFileSync(configPath, sampleConfig)
      console.log('\nCreated configuration file at ' + configPath + '\n')
    }
  } finally {
    const env = conf.get('env')
    conf.loadFile('config/config.' + env + '.json')
    conf.validate({ strict: true })
  }
}

loadConfig()

module.exports = conf
