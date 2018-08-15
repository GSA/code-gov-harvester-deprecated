const getRepoIndexConfig = require('./repos');
const Indexer = require('./indexer');
const ElasticsearchAdapter = require('../elasticsearch_adapter');

function getIndexer(indexerType, config) {
  const adapter = ElasticsearchAdapter(config);

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
