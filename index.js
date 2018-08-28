const fetch = require('node-fetch');
const { getValidator } = require('@code.gov/code-gov-validator');
const JsonFile = require('jsonfile');

const getConfig = require('./config');
const Formatter = require('./libs/formatter');
const Logger = require('./libs/logger');
const getIndexer = require('./libs/indexers');
const {aliasSwap, cleanIndicesForAlias, optimizeIndex} = require('./libs/index_tools');
const ElasticsearchAdapter = require('./libs/elasticsearch_adapter');
const { calculateOverallCompliance } = require('./libs/utils');
const logger = new Logger({ name: 'harvester-main' });

const Reporter  = require('./libs/reporter');

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

async function processRepo(agency, repo, codeJsonVersion, validator) {
  let validationTotals = {
    errors: 0,
    warnings: 0,
    enhancements: 0
  };
  let validationIssues;

  try {
    logger.debug(`Validating repo: ${repo.name}`);
    const validationResults = await validator.validateRepo(repo, agency);

    if(validationResults.issues) {
      validationTotals.errors += validationResults.issues.errors.length ? validationResults.issues.errors.length : 0;
      validationTotals.warnings += validationResults.issues.warnings.length ? validationResults.issues.warnings.length : 0;
      validationTotals.enhancements += validationResults.issues.enhancements.length ?
        validationResults.issues.enhancements.length : 0;

      validationIssues = validationResults.issues;
    }

    validator.cleaner(repo);

    const formatter = new Formatter();
    const formattedRepo = await formatter.formatRepo(repo, agency, codeJsonVersion);

    logger.debug(`Formatted repo: ${repo.repoId}`, formattedRepo);

    return {
      formattedRepo,
      validationIssues,
      validationTotals
    };
  } catch(error) {
    logger.trace(`ERROR - processing repo: ${repo.name}`, error);
    throw error;
  }
}

function createReportDetailsString(stringPrefix, reportDetails) {
  return stringPrefix + reportDetails.join(', ');
}

function processValidationTotals(validationTotals, agency) {
  let reportDetails = [];
  let totalErrors = 0;
  let reportStringPrefix = '';

  if(validationTotals.errors) {
    totalErrors += validationTotals.errors;
    reportDetails.push(`${validationTotals.errors} ERRORS`);
  }
  if(validationTotals.warnings) {
    totalErrors += validationTotals.warnings;
    reportDetails.push(`${validationTotals.warnings} WARNINGS`);
  }

  if(validationTotals.enhancements) {
    reportDetails.push(`${validationTotals.enhancements} REQUESTED ENHANCEMENTS`);
  }

  if(totalErrors) {
    reportStringPrefix = 'NOT FULLY COMPLIANT: ';
  } else {
    agency.requirements.schemaFormat = 1;
    reportStringPrefix = 'FULLY COMPLIANT: ';
  }

  return createReportDetailsString(reportStringPrefix, reportDetails);
}

async function indexOptimizations(indexName, indexAlias, adapter) {
  try {
    logger.info(`Optimizing index: ${indexName}`);
    const response = await optimizeIndex(indexName, adapter);
    logger.debug(response);
  } catch(error) {
    logger.trace(error);
    throw error;
  }
  try {
    logger.info(`Swapping index alias: ${indexAlias}`);
    const response = await aliasSwap(indexName, indexAlias, adapter);
    logger.debug(response);
  } catch(error) {
    logger.trace(error);
    throw error;
  }
  try {
    logger.info(`Cleaning indecies for alias: ${indexAlias}`);
    const response = await cleanIndicesForAlias(indexAlias, 7, adapter);
    logger.debug(response);
  } catch(error) {
    logger.trace(error);
    throw error;
  }
}

async function processAgencyRepos(agencies, repoIndexer) {
  const reporter = new Reporter(config);
  let validationTotals;
  let reportDetails;

  for(let agency of agencies) {
    let jsonData = undefined;
    reporter.reportMetadata(agency.acronym, agency);
    try {
      logger.info(`Fetching Code.json for ${agency.acronym}`);
      jsonData = await getCodeJson(agency.codeUrl);
    } catch(error) {
      logger.error(`ERROR fetching code.json for ${agency.acronym}`,error);
    }

    reporter.reportVersion(agency.acronym, jsonData.version);

    if(jsonData) {
      const reposCount = jsonData.releases.length;
      logger.info(`Processing ${reposCount} repos for agency ${agency.acronym}.`);

      if(reposCount === 0 ) {
        logger.trace(`ERROR: ${agency.acronym} code.json has no projects or releaseEvents.`);
        reportDetails = createReportDetailsString('NOT COMPLIANT: ', ['Agency has not releases/repositories published.']);
      } else {
        try {
          const validator = getValidator(jsonData);
          for(let repo of jsonData.releases) {
            const result = processRepo(agency, repo, jsonData.version, validator);

            validationTotals = result.validationTotals;
            reporter.reportIssues(agency.acronym, result.validationIssues);
            repoIndexer.indexDocument(result.formattedRepo);
          }
          reportDetails = processValidationTotals(validationTotals);
        } catch(error) {
          logger.error(error);
        }
      }

      agency.requirements.overallCompliance = calculateOverallCompliance(agency.requirements);
      reporter.reportRequirements(agency.acronym, agency.requirements);
      reporter.reportStatus(agency.acronym, reportDetails);
    }
  }
}
async function processTerms(indexer) {

}
async function main(agencies, config) {
  const adapter = new ElasticsearchAdapter(config);

  try {
    logger.info('Creating Repo index.');
    const repoIndexer = await createIndex('repos', adapter);
    await processAgencyRepos(agencies, repoIndexer);
    await indexOptimizations(repoIndexer.esIndex, repoIndexer.esAlias, adapter);
  } catch(error) {
    logger.error('Error while creating repo index', error);
    process.exit(1);
  }


  try {
    logger.info('Creating Terms index');
    const termsIndexer = await createIndex('terms', adapter);
    await processTerms(termsIndexer);
  } catch (error) {
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
