const _ = require('lodash');
const Logger = require('../logger');
const { toDays } = require('../utils');
const { getIndexesForAlias } = require('./utils');

const logger = new Logger({ name: 'index-cleaner' });

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
    const indices = await getIndices(aliasName, daysToKeep, client);

    if(indices.length > 0) {
      const filtertedIndices = await filterAliasedIndices(aliasName, indices, client);
      const response = await deleteIndices(filtertedIndices, client);
      logger.debug('Aliases deleted', response);
      return response;
    }

    return {};
  } catch(error) {
    throw error;
  }
}
module.exports = {
  getIndices,
  filterAliasedIndices,
  deleteIndices,
  cleanIndicesForAlias
};
