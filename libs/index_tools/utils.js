const _ = require('lodash');
const Logger = require('../logger');

const logger = new Logger({ name: 'index-tools-utils' });

/**
 * Gets an array of indices that are associated with the alias
 *
 * @param {any} aliasName The alias to check for.
 * @param {any} callback
 */
async function getIndexesForAlias(aliasName, client) {
  logger.debug(`Getting indexes for alias (${aliasName}).`);
  try{
    const response = await client.indices.getAlias({
      name: aliasName
    });
    let indices = [];
    _.forEach(response, function (item, key) {
      if (_.has(item, ['aliases', aliasName])) {
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
 * Gets an array of indices that are associated with the alias
 *
 * @param {any} aliasName The alias to check for.
 * @param {any} callback
 */
async function aliasExists(aliasName, client) {
  logger.debug(`Checking existance of alias (${aliasName}).`);
  try {
    return await client.indices.existsAlias({ name: aliasName });
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getIndexesForAlias,
  aliasExists
};
