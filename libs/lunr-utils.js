const fs = require('fs')
const lunr = require('lunr')
const {logger} = require('./utils')

function writeLunrIndex(releases, filePath, options) {
  const releasesIndex = lunr(function () {

    this.ref(options.id)
    options.fields.forEach(field => this.field(field))
  
    Object.values(releases).forEach(repo => this.add(repo))
  })
  
  fs.writeFile(filePath, JSON.stringify(releasesIndex.toJSON()), 'utf8', function (err) {
    if (err) {
      logger.error(err)
    }
  })
}

module.exports = writeLunrIndex
