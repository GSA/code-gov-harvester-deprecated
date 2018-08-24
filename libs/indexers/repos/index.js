const repoIndexMappings = require('./elasticsearch_mappings_settings/mapping_201.json');
const repoIndexSettings = require('./elasticsearch_mappings_settings/settings.json');

function getRepoIndexConfig() {
  return {
    'esAlias': 'repos',
    'esType': 'repo',
    'esMapping': repoIndexMappings,
    'esSettings': repoIndexSettings
  };
}

module.exports = getRepoIndexConfig;
