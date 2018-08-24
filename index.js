const fetch = require('node-fetch');
const { getValidator } = require('@code.gov/code-gov-validator');
const JsonFile = require('jsonfile');

const getConfig = require('./config');
const Formatter = require('./libs/formatter');
const Logger = require('./libs/logger');
const getIndexer = require('./libs/indexers');
const {aliasSwap, cleanIndicesForAlias, optimizeIndex} = require('./libs/index_tools');
const ElasticsearchAdapter = require('./libs/elasticsearch_adapter');

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

async function createIndex(indexType, adapter) {
  const repoIndexer = getIndexer(indexType, adapter);
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
    logger.trace(error);
    throw error;
  }
}

function generateStatusReport() {
  // Take a look at ../code-gov-api/services/indexer/repo/AgencyJsonStream.js
  return {};
}

async function main(agencies, config) {
  const adapter = new ElasticsearchAdapter(config);
  let repoIndexer;

  try {
    logger.info('Creating index.');
    repoIndexer = await createIndex('repos', adapter);
  } catch(error) {
    logger.error('Error while creating repo index', error);
    process.exit(1);
  }


  for(let agency of agencies) {
    let jsonData = undefined;
    try {
      logger.info(`Fetching Code.json for ${agency.acronym}`);
      jsonData = await getCodeJson(agency.codeUrl);
    } catch(error) {
      logger.error(`ERROR fetching code.json for ${agency.acronym}`,error);
    }

    if(jsonData) {
      const reposCount = jsonData.releases.length;
      logger.info(`Processing ${reposCount} repos for agency ${agency.acronym}.`);
      for(let repo of jsonData.releases) {
        try {
          const validator = getValidator(jsonData);

          logger.debug(`Validating repo: ${repo.name}`);
          const validationResults = await validator.validateRepo(repo, agency);

          // TODO: Calculate complaince dashboard
          // TODO: Index validation Results into status index

          const formatter = new Formatter();

          const formattedRepo = await formatter.formatRepo(repo, agency, jsonData.version);

          logger.debug(`Formatted repo: ${repo.repoId}`, formattedRepo);

          repoIndexer.indexDocument(repo);
        } catch(error) {
          logger.error(`ERROR - processing repo: ${repo.name}`, error);
        }
      }
    }
  }

  try {
    logger.info(`Optimizing index: ${repoIndexer.esIndex}`);
    const response = await optimizeIndex(repoIndexer.esIndex, adapter);
    logger.debug(response);
  } catch(error) {
    logger.error(error);
  }
  try {
    logger.info(`Swapping index alias: ${repoIndexer.esAlias}`);
    const response = await aliasSwap(repoIndexer.esIndex, repoIndexer.esAlias, adapter);
    logger.debug(response);
  } catch(error) {
    logger.error(error);
  }
  try {
    logger.info(`Cleaning indecies for alias: ${repoIndexer.esAlias}`);
    const response = await cleanIndicesForAlias(repoIndexer.esAlias, 7, adapter);
    logger.debug(response);
  } catch(error) {
    logger.error(error);
  }
}

logger.info('[STARTED]: Code.json processing');

// const reporter = new Reporter({REPORT_FILEPATH: './data/report.json'}, logger)

const config = getConfig();

// should this be a stream? Can this be streamed or yielded as to not have all the json data in memory?
JsonFile.readFile(config.DATA_SOURCES_MEDATA_FILE, (error, agencies) => {
  if(error) {
    logger.error(error);
    process.exit(1);
  }
  main(agencies, config);
});
