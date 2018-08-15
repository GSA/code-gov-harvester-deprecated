const fetch = require('node-fetch');
const { getValidator } = require('@code.gov/code-gov-validator');
const JsonFile = require('jsonfile');

const Formatter = require('./libs/formatter');
const Logger = require('./libs/logger');
const getIndexer = require('./libs/indexers');

const logger = new Logger({ name: 'harvester-main' });

// const Reporter  = require('./libs/reporter');

/**
 * Fetches JSON data from supplied URL
 * @param {string} jsonUrl Valid URL from whre to fetch the JSON data
 * @returns Returns a promise object that resolves into JSON data
 */
async function getCodeJson(jsonUrl) {
  try {
    const result = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'code.gov',
        'Content-Type': 'application/json',
      }
    });
    return result.json();
  } catch(error) {
    logger.error(error);
  }
}

async function createIndex() {
  const repoIndexer = getIndexer('repos');
  try {
    let elasticSearchResponse;
    const exists = await repoIndexer.indexExists();

    if(exists) {
      elasticSearchResponse = await repoIndexer.deleteIndex();
      logger.debug(elasticSearchResponse);
    }

    elasticSearchResponse = await repoIndexer.initIndex();
    logger.debug(elasticSearchResponse);

    elasticSearchResponse = await repoIndexer.initMapping();
    logger.debug(elasticSearchResponse);

    return repoIndexer;
  } catch(error) {
    throw error;
  }
}

function optimizeIndex() {
  // Take a look at ../code-gov-api/services/indexer/index_optimizer.js init()
  return {};
}
function swapIndexAlias() {
  // Take a look at ../code-gov-api/services/indexer/alias_swapper.js init()
  return {};
}
function cleanIndex() {
  // Take a look at ../code-gov-api/services/indexer/index_cleaner.js init()
  return {};
}
function generateStatusReport() {
  // Take a look at ../code-gov-api/services/indexer/repo/AgencyJsonStream.js
  return {};
}

async function main(agencies, reporter) {
  // Create index with today's timestamp
  let repoIndexer;
  try {
    repoIndexer = await createIndex('repos');
  } catch(error) {
    logger.error('Error while creating repo index', error);
    process.exit();
  }

  try {
    for(let agency of agencies) {
      const jsonData = await getCodeJson(agency.codeUrl);

      const validator = getValidator(jsonData);

      for(let repo of jsonData.releases) {
        const validationResults = await validator.validateRepo(repo, agency);
        // TODO: Calculate complaince dashboard
        // TODO: Index validation Results into status index

        const formatter = new Formatter();
        const formattedRepo = await formatter.formatRepo(repo, agency, jsonData.version);

        logger.debug(formattedRepo);

        repoIndexer.indexDocumet(repo);
      }
    }
    optimizeIndex();
    swapIndexAlias();
    cleanIndex();
  } catch(error) {
    logger.error(error);
  }
}

logger.info('[STARTED]: Code.json processing');

// const reporter = new Reporter({REPORT_FILEPATH: './data/report.json'}, logger)

// should this be a stream? Can this be streamed or yielded as to not have all the json data in memory?
JsonFile.readFile('./data/data_sources_metadata.json', (error, agencies) => {
  main(agencies, {});
});
