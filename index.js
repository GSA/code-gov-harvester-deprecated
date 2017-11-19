require('core-js/es7/object')
const request = require('request-promise')
const errors = require('request-promise/errors')
const fs = require('fs')
const lunr = require('lunr')
const { validateJson, upgradeProject, mergeJson, getVersion, logger, writeReleasesJson } = require('./libs/utils')
const writeLunrIndex = require('./libs/lunr-utils')
const app = require('commander')
const getConfig = require('./config')
const JsonFile = require('jsonfile')
const path = require('path')

const agencyRepoCount = {}

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

function main(config, addresses) {
  Promise.all(
    addresses.map((address) => {
      const requestOptions = {
        uri: address,
        rejectUnauthorized: false,
        headers: {
          'Accept': 'application/json',
          'User-Agent': config.userAgent
        }
      }
      return getCodeJson(requestOptions)
    }))
    .then(function (allCodeJsons) {
      const dataDirPath = path.join(__dirname, config.dataDir)

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

      // Don't think I need this ... We may not want to set a "default"
      // const defaultReleases = JsonFile.readFile(path.join(dataDirPath, 'defaultReleases.json'))
      // finalReleasesJson = mergeJson(finalReleasesJson, defaultReleases.releases)

      // const releasesString = JSON.stringify({
      //   releases: finalReleasesJson
      // })
      const outputTimestamp = (new Date()).toISOString()


      writeReleasesJson({releases: finalReleasesJson},
        path.join(__dirname, dataDirPath, `releasesIndex-${outputTimestamp}.json`)
      )

      writeLunrIndex({releases: finalReleasesJson}, 
        path.join(__dirname, dataDirPath, `releasesIndex-${outputTimestamp}.json`), 
        ['name', 'agency', 'description']
      )

      fs.writeFile(path.join(__dirname, dataDirPath, 'processed_agency_repo_count.json'), JSON.stringify(agencyRepoCount), 'utf8', function (err) {
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

app.version(getVersion())
  .option('-o | --output <path>', 'Output path for result files.')
  .option('-a | --agencies <agencies...>', 'List of agencies to process. Passed values should be agency\'s acronym (Eg. DOD, HHS, GSA). Default is [all].')
  .action((output, agencies) => {
    logger.info('[STARTED]: Code.json processing')
    if(!agencies) {
      // TODO: needs to have way to look up url by agency acronym
      agencies = [
        'https://usaid.gov/code.json',
        'https://consumerfinance.gov/code.json',
        'https://www.dhs.gov/code.json',
        'https://www.commerce.gov/code.json',
        'https://www.defense.gov/code.json',
        'https://energy.gov/code.json',
        'https://data.doi.gov/code.json',
        'https://justice.gov/code.json',
        'https://www.dol.gov/code.json',
        'http://state.gov/code.json',
        'https://www.transportation.gov/code.json',
        'https://www2.ed.gov/code.json',
        'https://epa.gov/code.json',
        'https://fema.gov/code.json',
        'https://gsa.gov/code.json',
        'https://hhs.gov/code.json',
        'https://www.hud.gov/code.json',
        'https://www.archives.gov/code.json',
        'https://code.nasa.gov/code.json',
        'https://www.nrc.gov/code.json',
        'https://nsf.gov/code.json',
        'https://opm.gov/code.json',
        'https://sba.gov/code.json',
        'https://www.ssa.gov/code.json',
        'https://www.treasury.gov/code.json',
        'https://www.usda.gov/code.json',
        'https://va.gov/code.json',
      ]
    }

    const config = getConfig({ outputPath: app.output})
    main(config, agencies)
  })