const repoIndexMappings = require('./indexes_mappings_and_settings/repo/mapping_201.json');
const repoIndexSettings = require('./indexes_mappings_and_settings/repo/settings.json');

function getRepoIndexConfig() {
  return {
    'esAlias': 'repos',
    'esType': 'repo',
    'esMapping': repoIndexMappings,
    'esSettings': repoIndexSettings
  };
}

module.exports = getRepoIndexConfig;
