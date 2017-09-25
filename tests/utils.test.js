const Ajv = require('ajv')
const chai = require('chai'),
      should = chai.should(),
      expect = chai.expect

const validateJson = require('../libs/utils').validateJson,
    upgradeProject = require('../libs/utils').upgradeProject

describe('Json Validation', function() {
    it('wrong data for schema v1.0.1', function(){
        const badJson = require('./bad-data.json')
        const validator = validateJson(badJson)

        validator.should.have.property('errors').not.equal(null)
    })
    it('correct schema v1.0.1', function() {
        const goodJson = require('./good-data.json')
        const validator = validateJson(goodJson)

        validator.should.have.property('errors').equal(null)
    })
})

describe('Upgrade Code.json to 2.0.0', function() {
    it('upgrades code.json from 1.0.1 to 2.0.0', function() {
        const codeJson = require('./code.json')
        const expectedReleasesLength = codeJson.projects.length

        codeJson.releases = codeJson.projects.map(upgradeProject)
        
        codeJson.releases.length.should.equal(expectedReleasesLength)
        codeJson.releases[0].should.have.property('relatedCode')
    })
})