const Logger = require('../logger');
const logger = new Logger({ name: 'inde-optimizer' });

/**
 * Optimizes (forceMerge) an index into 1 segment so that
 * all elasticsearch servers return the same scores for
 * searches.
 *
 * @param {string} indexName The index to optimize.
 * @returns {Promise} Promise with Elasticsearch result.
 */
function optimizeIndex(indexName, adapter) {
  return new Promise((resolve, reject) => {
    logger.debug(`Optimizing Index (${indexName})`);
    adapter.client.indices.forcemerge({
      maxNumSegments: 1,
      index: indexName,
      requestTimeout: 90000
    }, (error, response, status) => {
      if(error) {
        reject(error);
      }
      if (status) {
        this.logger.debug('Status', status);
      }
      resolve(response);
    });
  });
}

module.exports = optimizeIndex;
