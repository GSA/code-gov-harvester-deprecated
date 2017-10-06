require('core-js/es7/object');
const request = require('request-promise');
const errors = require('request-promise/errors')
const fs = require('fs');
const lunr = require('lunr');
const validateJson = require('./libs/utils').validateJson
const upgradeProject = require('./libs/utils').upgradeProject
const mergeJson = require('./libs/utils').mergeJson

const winston = require('winston')
const logger = new (winston.Logger)({
    level: 'info',
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            prettyPrint: true
        }),
        new (winston.transports.File)({
            name: 'general-logger',
            filename: 'harvester.log.json'
        }),
        new (winston.transports.File)({
            name: 'error-logger',
            filename: 'harvester-errors.log.json',
            level: 'error'
        })
    ]
})

function getCodeJson(requestOptions) {
    return request.get(requestOptions)
    .then(function (json) {
        logger.info(`Validating JSON from ${requestOptions.uri}`)
        const returnedJsonType = (typeof json)

        if ( returnedJsonType === 'object') {
            const results = validateJson(json)

            if (results.errors) {
                validationErrorMsg = `Repo: ${requestOptions.uri} has not passed schema validation. Errors: `
                results.errors.forEach(function(error) {
                    validationErrorMsg += `Error type: ${error.keyword} ${error.dataPath} ${error.message} | `
                })
                throw new Error(validationErrorMsg)
            }

            if (json.version === '1.0.1' || json.hasOwnProperty('projects')) {
                json.releases = json.projects.map(upgradeProject)
                return json
            } else if(json.version === '2.0.0' || json.hasOwnProperty('releases')) {
                return json
            } else {
                throw new Error(`JSON found at URL: ${requestOptions.uri} is of the wrong version or does not have the properties to determine it.`);
            }
        } else {
            throw new Error(`JSON found at URL: ${requestOptions.uri} is of unexpected type: ${returnedJsonType}.`)
        }
    })
    .catch(errors.StatusCodeError, function(reason) {
        logger.error(`error loading: ${requestOptions.uri} - reason: statusCode ${reason.statusCode}`);
        return {
            releases: []
        };
    })
    .catch(errors.RequestError, function (reason) {
        logger.error(`error loading: ${requestOptions.uri} - reason: ${reason.cause}`);
        return {
            releases: []
        };
    })
    .catch(function(err) {
        logger.error(err);
        return {
            releases: []
        };
    });
}

function main(addresses) {
    Promise.all(
        addresses.map((address) => {
            const requestOptions = {
                uri: address,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Code-Gov'
                },
                json: true
            }
            return getCodeJson(requestOptions);
        })
    )
    .then(function (allCodeJsons) {
        let finalReleasesJson = allCodeJsons.map(function (codeJson) {
            return codeJson.releases.map(function (release) {
                const id = encodeURIComponent(codeJson.agency) + '/' + encodeURIComponent(release.name);

                release.id = id;
                release.agency = codeJson.agency;

                return release;
            });
        })
        .reduce(function (releasesJson, releases) {
            return releases.reduce(function (r, release) {
                r[release.id] = release;

                return r;
            }, releasesJson);
        }, {});

        const defaultReleases = require('./data/defaultReleases.json')
        finalReleasesJson = mergeJson(finalReleasesJson, defaultReleases.releases)

        const releasesString = JSON.stringify({
            releases: finalReleasesJson
        });
        const outputTimestamp = (new Date()).toISOString()

        fs.writeFile(`./data/releases-${outputTimestamp}.json`, releasesString, 'utf8', function (err) {
            if (err) {
                logger.error(err);
            }
        });

        const releasesIndex = lunr(function () {
            this.ref('id');
            this.field('name');
            this.field('agency');
            this.field('description');

            Object.values(finalReleasesJson).forEach(repo => this.add(repo));
        });

        fs.writeFile(`./data/releasesIndex-${outputTimestamp}.json`, JSON.stringify(releasesIndex.toJSON()), 'utf8', function (err) {
            if (err) {
                logger.error(err);
            }
        });
        console.timeEnd("Code.json processing")
    })
    .catch(function (err) {
        logger.error(err);
    });

}

console.time("Code.json processing")
main([
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
]);
