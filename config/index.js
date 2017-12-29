const path = require('path')
const JsonFile = require('jsonfile')

function getConfig(options) {
  let dataDir = path.join(__dirname, 'data')
  let schema101Path = path.join(__dirname, 'schemas/code_1_0_1.json')
  let schema200Path = path.join(__dirname, 'schemas/code_2_0_0.json')
  let loggerLevel = 'debug'
  let loggerFilename = 'harvester.log.json'
  let loggerErrorFilename = 'harvester-errors.log.json'
  let requestUserAgent = 'code.gov'
  const defaultAgencies = JsonFile.readFileSync('./agency_metadata.json', {encoding: 'utf8'})

  if(process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production') {
    loggerLevel = 'info'
  }

  if(options.outputPath) {
    dataDir = options.outputPath
  }

  return {
    dataDir,
    schema101Path,
    schema200Path,
    loggerLevel,
    loggerFilename,
    loggerErrorFilename,
    requestUserAgent,
    defaultAgencies
  }
}

module.exports = getConfig