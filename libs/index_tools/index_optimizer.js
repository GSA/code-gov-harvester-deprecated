const Logger = require('../logger');
const logger = new Logger({ name: 'index-optimizer' });

/**
 * Optimizes (forceMerge) an index into 1 segment so that
 * all elasticsearch servers return the same scores for
 * searches.
 *
 * @param {string} indexName The index to optimize.
 * @returns {Promise} Promise with Elasticsearch result.
 */
async function optimizeIndex(indexName, adapter) {
  logger.debug('Entered optimizeIndex');

  try {
    return await adapter.client.indices.forcemerge({
      maxNumSegments: 1,
      index: indexName,
      requestTimeout: 90000
    });
  } catch(error) {
    logger.trace(error);
    throw error;
  }
}

module.exports = optimizeIndex;
