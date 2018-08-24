const getRepoIndexConfig = require('./repos');
const Indexer = require('./indexer');

function getIndexer(indexerType, adapter) {
  if(indexerType === 'repos') {
    const repoIndexConfig = getRepoIndexConfig();
    return new Indexer(adapter, repoIndexConfig);
  }

  if(indexerType === 'terms') {
    return {};
  }

  return {};
}

module.exports = getIndexer;
