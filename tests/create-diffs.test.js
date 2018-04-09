const chai = require('chai'),
  should = chai.should()
const path = require('path')
const { createDiffs } = require('../commands/index')

describe('Create Diffs', function() {
  let logger
  let config

  before(function() {
    logger = {
      info: () => {},
      debug: () => {},
      error: () => {}
    }

    config = {
      AGENCY_ENDPOINTS_FILE: path.join(__dirname, 'test-data/agency_metadata_test.json'),
      FETCHED_DIR: path.join(__dirname, 'test-data/create-diffs-tests/fetched'),
      DISCOVERED_DIR: path.join(__dirname, 'test-data/create-diffs-tests/discovered'),
      DIFFED_DIR: path.join(__dirname, 'test-data/create-diffs-tests/diffs')
    }
  })

  it('should return diff from supplied JSON files', function() {
    return createDiffs(config, logger)
      .then(() => {
        const diff = require(path.join(config.DIFFED_DIR, 'FAKE.json'))

        diff.should.be.a('array')
        diff.length.should.equal(3)
        diff[0].count.should.equal(98)
        diff[1].count.should.equal(166)
        diff[2].count.should.equal(3)
      })
  })
})