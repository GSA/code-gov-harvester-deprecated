const Logger = require('../logger');
const { getIndexesForAlias, aliasExists } = require('./utils');

const logger = new Logger({ name: 'alias-swapper'} );

function createAction(actionType, index, alias) {
  let action = {};
  action[actionType] = {
    'index': index,
    'alias': alias
  };
  return action;
}

/**
 * Gets an array of indices that are associated with the alias
 *
 * @param {any} aliasName The alias to check for.
 * @param {any} callback
 */
async function updateAliases(actions, client) {
  logger.debug('Updating aliases.');

  try {
    return await client.indices.updateAliases({
      body: {
        actions: actions
      }
    });
  } catch(error) {
    logger.trace('ERROR updating aliases', error);
    throw error;
  }
}

/**
 * Initializes and executes the swapping of aliases for repos
 *
 * @param {any} adapter The search adapter to use for making requests to ElasticSearch
 * @param {any} indexName Name of the index we are working with
 * @param {any} indexAlias Index alias we are working with.
 */
async function aliasSwap(indexName, indexAlias, adapter) {
  logger.info('Starting alias swapping.');

  const client = adapter.getClient();
  let exists;
  try{
    exists = await aliasExists(indexAlias, client);
  } catch(error) {
    logger.trace(`ERROR aliasExists for alias: ${indexAlias}`);
  }
  let actions = [];

  if(exists) {
    try {
      const indices = await getIndexesForAlias(indexAlias, client);
      for(let index of indices) {
        actions.push(createAction('remove', index, indexAlias));
      }
    } catch(error) {
      logger.trace(`ERROR getting indexes for Alias: ${indexAlias}`,error);
    }

  }

  actions.push(createAction('add', indexName, indexAlias));

  const response = await updateAliases(actions, client);

  return response;
}

module.exports = {
  updateAliases,
  aliasSwap,
  createAction
};
