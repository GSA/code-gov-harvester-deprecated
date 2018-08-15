const _ = require('lodash');
const Logger = require('../logger');
const getConfig = require('../../config');
const { toDays } = require('../utils');
const logger = new Logger({ name: 'index-cleaner' });

const { getIndexesForAlias } = require('./utils');

// If we are running this module directly from Node this code will execute.
// This will index all repos taking our default input.
if (require.main === module) {
  //TODO: Make parameters
  const reposAlias = 'repos';
  const numDays = 10;
  const elasticsearchAdapter = new ElasticsearchAdapter(getConfig(process.env.NODE_ENV));

  IndexCleaner.init(elasticsearchAdapter, reposAlias, numDays, (err)=> {
    if (err) {
      Logger.error('Errors Occurred: ' + err);
    } else {
      Logger.info('Cleaning Completed.');
    }
  });
}

/**
 * Gets all indices for a given alias.
 * @param {string} aliasName The name of the alias to get indecies from
 * @param {number} daysToKeep Number of day back to keep
 * @param {object} client Elasticsearch client
 */
async function getIndices(aliasName, daysToKeep, client) {
  logger.debug(`Getting Indices for (${aliasName})`);
  try {
    const response = await client.indices.getSettings({
      index: (aliasName + '*'),
      name: 'index.creation_date' //Only get creation date field
    });

    let indices = [];

    let currTime = toDays(Date.now());
    let cutoffTime = currTime - daysToKeep;

    _.forEach(response, (value, key) => {
      let index_date = toDays(value['settings']['index']['creation_date']);
      if (index_date < cutoffTime) {
        indices.push(key);
      }
    });
    return indices;
  } catch(error) {
    logger.trace(error);
    throw error;
  }
}
/**
 * Removes any indices from a list that are associated with a specific alias.
 *
 * @param {any} aliasName The alias to check
 * @param {any} indices A list of indices to filter
 */
async function filterAliasedIndices(aliasName, indices, client) {
  try {
    const aliasIndices = await getIndexesForAlias(aliasName, client);
    return _.difference(indices, aliasIndices);
  } catch (error) {
    logger.trace(error);
    throw error;
  }

}
/**
 * Deletes a list of indices from ElasticSearch
 *
 * @param {Array} indices Array of indices to delete
 * @param {object} client Elasticsearch client
 */
async function deleteIndices(indices, client) {
  try {
    return await client.indices.delete({
      index: indices,
      requestTimeout: 90000
    });
  } catch(error) {
    logger.trace(error);
    throw error;
  }

}

/**
 * Performs all the steps to clean a single alias
 *
 * @param {string} aliasName The Elasticsearch index alias to clean up
 * @param {number} daysToKeep Number of days back to keep
 * @param {object} adapter Elasticsearch adapter
 */
async function cleanIndicesForAlias(aliasName, daysToKeep, adapter) {
  try {
    const client = adapter.getClient();
    const indices = await getIndices(aliasName, daysToKeep);
    const filtertedIndices = await filterAliasedIndices(aliasName, indices, client);
    const response = await deleteIndices(filtertedIndices);
    logger.debug('Aliases deleted', response);
  } catch(error) {
    throw error;
  }
}
module.exports = cleanIndicesForAlias;
