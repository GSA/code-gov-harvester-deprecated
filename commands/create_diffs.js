const fs = require('fs')
const path = require('path')
const Jsonfile = require('jsonfile')
const diff = require('diff')
const JSONStream = require('JSONStream')
const { Writable } = require('stream')
const getConfig = require('../config')

class CreateDiffStream extends Writable {

  constructor(config, logger) {
    super({objectMode: true})
    this.config = config
    this.logger = logger
  }

  _readFile(folderDir, filename) {
    this.logger.debug(`Reading file: ${filename}`)

    const filePath = path.join(folderDir, filename)

    return new Promise((resolve, reject) => {
      Jsonfile.readFile(filePath, (error, data) => {
        if(error) {
          reject(error)
        }
        resolve(data)
      })
    })
  }

  _performDiff(agency) {
    this.logger.info(`Performing diff for ${agency}...`)

    return new Promise((resolve, reject) => {
      Promise.all([
        this._readFile(this.config.FETCHED_DIR, `${agency}.json`),
        this._readFile(this.config.DISCOVERED_DIR, `${agency}.json`)
      ])
        .then(values => {
          this.logger.debug('_performDiff promise resolution')
          const diffResult = diff.diffJson(values[0], values[1])
          resolve(diffResult)
        }, error => {
          reject(error)
        })
    })
  }

  _write(agency, enc, next) {
    let agencyName = agency.acronym.toUpperCase()
    this._performDiff(agencyName)
      .then(diffChunks => {
        const diffedFilepath = path.join(this.config.DIFFED_DIR, `${agencyName}.json`)
        this.logger.info(`Writing output to ${diffedFilepath}...`)

        Jsonfile.writeFile(diffedFilepath, diffChunks, {spaces: 2}, error => {
          if (error) {
            this.logger.error(error)
            return next(error)
          }
          return next()
        })
      })
      .catch(error => {
        this.logger.error(error)
        next(error)
      })
  }
}

function createDiffs(config, logger) {
  let readStream = fs.createReadStream(config.AGENCY_ENDPOINTS_FILE)
  let jsonStream = JSONStream.parse('*')
  let diffStream = new CreateDiffStream(config, logger)

  return new Promise((resolve, reject) => {
    readStream.pipe(jsonStream)
      .pipe(diffStream)
      .on('error', (error) => {
        logger.error(error)
        reject(error)
      })
      .on('finish', () => {
        logger.info('Done.')
        resolve()
      })
  })

}

if(!module.parent) {
  createDiffs(getConfig(process.env.NODE_ENV))
}

module.exports = createDiffs
