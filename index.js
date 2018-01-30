require('core-js/es7/object')
const request = require('request-promise')
const errors = require('request-promise/errors')
const fs = require('fs')
const lunr = require('lunr')
const { validateJson, upgradeProject, getAgencyStatus, handleError, mergeJson } = require('./libs/utils')
const Reporter  = require('./libs/reporter')
const JsonFile = require('jsonfile')

const agencyRepoCount = {}

const winston = require('winston')
const logger = new(winston.Logger)({
  level: 'info',
  transports: [
    new(winston.transports.Console)({
      colorize: true,
      prettyPrint: true,
      timestamp: true
    }),
    new(winston.transports.File)({
      name: 'general-logger',
      filename: 'harvester.log.json',
      timestamp: true
    }),
    new(winston.transports.File)({
      name: 'error-logger',
      filename: 'harvester-errors.log.json',
      level: 'error',
      timestamp: true
    })
  ]
})

function validate(data, agency, reporter) {
  const results = validateJson(data)

  if (results.errors) {
    if(agency.complianceDashboard) {
      reporter.reportIssues(data.agency, results)
    }
    
    return false
  }

  agency.requirements.schemaFormat = 1
  return true
}
function format(data) {
  logger.info(`Formatting data from Agency: ${data.agency}`)

  if (data.version === '1.0.1' || data.hasOwnProperty('projects')) {
    data.releases = data.projects.map(upgradeProject)
    return data
  } else if (data.version === '2.0.0' || data.hasOwnProperty('releases')) {
    return data
  } else {
    throw `JSON Agency: ${data.agency} is of the wrong version or does not have the properties to determine it.`
  }
}
function writeReleasesFiles(releasesJson) {
  const defaultReleases = JsonFile.readFileSync('./data/defaultReleases.json')

  releasesJson = mergeJson(releasesJson, defaultReleases.releases)

  const releasesString = JSON.stringify({
    releases: releasesJson
  })
  const outputTimestamp = (new Date()).toISOString()

  fs.writeFile(`./data/releases-${outputTimestamp}.json`, releasesString, 'utf8', function (err) {
    if (err) {
      logger.error(err)
    }
  })

  const releasesIndex = lunr(function () {
    this.ref('id')
    this.field('name')
    this.field('agency')
    this.field('description')

    Object.values(releasesJson).forEach(repo => this.add(repo))
  })

  fs.writeFile(`./data/releasesIndex-${outputTimestamp}.json`, JSON.stringify(releasesIndex.toJSON()), 'utf8', function (err) {
    if (err) {
      logger.error(err)
    }
  })
}
function getCodeJson(requestOptions, agencyMetadata, reporter) {
  return request.get(requestOptions)
    .then(function (json) {
      logger.info(`Validating JSON for Agency: ${agencyMetadata.acronym}`)
      let formattedData

      try {
        formattedData = JSON.parse(json.replace(/^\uFEFF/, ''))
      } catch (err) {
        throw `Error formatting code.json for Agency: ${agencyMetadata.acronym} - `, err
      }
      
      if(agencyMetadata.complianceDashboard) {
        reporter.reportVersion(formattedData.agency, formattedData.version)
        reporter.reportMetadata(formattedData.agency, agencyMetadata)
      }
      const isCodeJsonValid = validate(formattedData, agencyMetadata, reporter)

      if (!isCodeJsonValid) {
        throw `Agency: ${agencyMetadata.acronym} has not passed schema validation.`
      }

      return format(formattedData)

    })
    .catch(errors.StatusCodeError, function (reason) {
      handleError(`error loading: ${requestOptions.uri} - reason: statusCode ${reason.statusCode}`, agencyMetadata, logger, reporter)
      return { releases: [] }
    })
    .catch(errors.RequestError, function (reason) {
      handleError(`error loading: ${requestOptions.uri} - reason: ${reason.cause}`, agencyMetadata, logger, reporter)
      return { releases: [] }
    })
    .catch(function (error) {
      handleError(`Agency: ${agencyMetadata.acronym} - Error: ${error}`, agencyMetadata, logger, reporter)
      return { releases: [] }
    })
    .finally(() => {

      if(agencyMetadata.complianceDashboard) {
        const agencyStatus = getAgencyStatus(agencyMetadata)
        reporter.reportStatus(agencyMetadata.acronym, agencyStatus)
        reporter.reportRequirements(agencyMetadata.acronym, agencyMetadata.requirements)
      }
    })
}

function main(agencies, reporter) {
  Promise.all(
    agencies.map((agency) => {
      const requestOptions = {
        uri: agency.codeUrl,
        rejectUnauthorized: false,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'code.gov'
        },
        gzip: true
      }
      return getCodeJson(requestOptions, agency, reporter)
    }))
    .then(function (allCodeJsons) {
      let finalReleasesJson = allCodeJsons.map(function (codeJson) {
        return codeJson.releases.map(function (release) {
          
          if(agencyRepoCount.hasOwnProperty(codeJson.agency)) {
            agencyRepoCount[codeJson.agency] += 1
          } else {
            agencyRepoCount[codeJson.agency] = 1
          }
          
          const id = encodeURIComponent(codeJson.agency) + '/' + encodeURIComponent(release.name)

          release.id = id
          release.agency = codeJson.agency

          return release
        })
      })
        .reduce(function (releasesJson, releases) {
          return releases.reduce(function (r, release) {
            r[release.id] = release
            return r
          }, releasesJson)
        }, {})

      writeReleasesFiles(finalReleasesJson)

      fs.writeFile('./data/processed_agency_repo_count.json', JSON.stringify(agencyRepoCount), 'utf8', function (err) {
        if (err) {
          logger.error(err)
        }
      })

      reporter.writeReportToFile()

      logger.info('[FINISHED]: Code.json processing')
    })
    .catch(function (err) {
      logger.error(err)
    })
    
}

logger.info('[STARTED]: Code.json processing')

const reporter = new Reporter({REPORT_FILEPATH: './data/report.json'}, logger)
JsonFile.readFile('./data/agencyMetadata.json', (error, agencies) => {
  main(agencies, reporter)
})
