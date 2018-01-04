require('core-js/es7/object')
const request = require('request-promise')
const errors = require('request-promise/errors')
const fs = require('fs')
const lunr = require('lunr')
const { validateJson } = require('./libs/utils')
const { upgradeProject } = require('./libs/utils')
const { mergeJson } = require('./libs/utils')

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

function getCodeJson(requestOptions) {
  return request.get(requestOptions)
    .then(function (json) {
      logger.info(`Validating JSON from ${requestOptions.uri}`)
      let formattedData
      let validationErrorMsg

      try {
        formattedData = JSON.parse(json.replace(/^\uFEFF/, ''))
      } catch (err) {
        throw new Error(`Error formatting code.json for ${requestOptions.uri} - `, err)
      }

      const results = validateJson(formattedData)

      if (results.errors) {
        validationErrorMsg = `Repo: ${requestOptions.uri} has not passed schema validation. Errors: `
        results.errors.forEach(function (error) {
          validationErrorMsg += `Error type: ${error.keyword} ${error.dataPath} ${error.message} | `
        })
        throw new Error(validationErrorMsg)
      }

      if (formattedData.version === '1.0.1' || formattedData.hasOwnProperty('projects')) {
        formattedData.releases = formattedData.projects.map(upgradeProject)
        return formattedData
      } else if (formattedData.version === '2.0.0' || formattedData.hasOwnProperty('releases')) {
        return formattedData
      } else {
        throw new Error(`JSON found at URL: ${requestOptions.uri} is of the wrong version or does not have the properties to determine it.`)
      }
    })
    .catch(errors.StatusCodeError, function (reason) {
      logger.error(`error loading: ${requestOptions.uri} - reason: statusCode ${reason.statusCode}`)
      return {
        releases: []
      }
    })
    .catch(errors.RequestError, function (reason) {
      logger.error(`error loading: ${requestOptions.uri} - reason: ${reason.cause}`)
      return {
        releases: []
      }
    })
    .catch(function (err) {
      logger.error(err)
      return {
        releases: []
      }
    })
}

function main(addresses) {
  Promise.all(
    addresses.map((address) => {
      const requestOptions = {
        uri: address,
        rejectUnauthorized: false,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'code.gov'
        }
      }
      return getCodeJson(requestOptions)
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

      const defaultReleases = require('./data/defaultReleases.json')
      finalReleasesJson = mergeJson(finalReleasesJson, defaultReleases.releases)

      const releasesString = JSON.stringify({
        releases: finalReleasesJson
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

        Object.values(finalReleasesJson).forEach(repo => this.add(repo))
      })

      fs.writeFile(`./data/releasesIndex-${outputTimestamp}.json`, JSON.stringify(releasesIndex.toJSON()), 'utf8', function (err) {
        if (err) {
          logger.error(err)
        }
      })
      fs.writeFile('./data/processed_agency_repo_count.json', JSON.stringify(agencyRepoCount), 'utf8', function (err) {
        if (err) {
          logger.error(err)
        }
      })

      logger.info('[FINISHED]: Code.json processing')
    })
    .catch(function (err) {
      logger.error(err)
    })
    
}

logger.info('[STARTED]: Code.json processing')

main([
  'https://www.usda.gov/code.json',
  'https://www.commerce.gov/code.json',
  'https://www.defense.gov/code.json',
  'https://www.ed.gov/code.json',
  'https://www.energy.gov/code.json',
  'https://www.hhs.gov/code.json',
  'https://www.dhs.gov/code.json',
  'https://www.hud.gov/code.json',
  'https://www.justice.gov/code.json',
  'https://www.dol.gov/code.json',
  'https://www.state.gov/code.json',
  'https://www.doi.gov/code.json',
  'https://www.treasury.gov/code.json',
  'https://www.transportation.gov/code.json',
  'https://www.va.gov/code.json',
  'https://www.epa.gov/code.json',
  'https://www.gsa.gov/code.json',
  'https://code.nasa.gov/code.json',
  'https://www.nsf.gov/code.json',
  'https://www.nrc.gov/code.json',
  'https://www.opm.gov/code.json',
  'https://www.sba.gov/code.json',
  'https://www.ssa.gov/code.json',
  'https://www.usaid.gov/code.json',
  'https://www.archives.gov/code.json',
  'https://www.consumerfinance.gov/code.json',
])

