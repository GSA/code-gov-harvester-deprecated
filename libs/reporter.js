/******************************************************************************

  REPORTER: a service which tracks the status of fetching/indexing and writes
  a report as a result

******************************************************************************/

const Jsonfile = require('jsonfile')
// const config = require('../../config')

class Reporter {

  constructor(config, logger) {
    this.logger = logger
    this.config = config
    this.report = {
      timestamp: (new Date()).toString(),
      statuses: {}
    }
  }

  _createReportItemIfDoesntExist(itemName) {
    // creates the report item if it doesn't already exist
    if (this.report.statuses[itemName] === undefined) {
      this.report.statuses[itemName] = {
        status: '',
        issues: [],
        version: '',
        metadata: {}
      }
    }
  }

  //deprecated
  reportStatus(itemName, status) {
    this._createReportItemIfDoesntExist(itemName)
    this.report.statuses[itemName]['status'] = status
  }

  reportIssues(itemName, issuesObj) {
    this._createReportItemIfDoesntExist(itemName)
    issuesObj.errors.forEach(error => this.report.statuses[itemName]['issues'].push(error))
  }

  reportVersion(itemName, version) {
    this._createReportItemIfDoesntExist(itemName)
    this.report.statuses[itemName]['version'] = version
  }

  reportMetadata(itemName, metadata) {
    this._createReportItemIfDoesntExist(itemName)
    this.report.statuses[itemName]['metadata'] = {
      agency: {
        id: metadata.id,
        name: metadata.name,
        acronym: metadata.acronym,
        website: metadata.website,
        codeUrl: metadata.codeUrl 
      }
    }
  }

  reportRequirements(itemName, requirements) {
    this._createReportItemIfDoesntExist(itemName)
    this.report.statuses[itemName]['requirements'] = requirements
  }

  writeReportToFile() {
    return new Promise((fulfill, reject) => {
      this.logger.info('Writing report to file...')
      this.report.timestamp = (new Date()).toString()

      Jsonfile.writeFile(this.config.REPORT_FILEPATH, this.report, { spaces: 2 }, (err) => {
        if (err) {
          reject(err)
        }
        fulfill(err)
      })
    })
  }
}

module.exports = Reporter
