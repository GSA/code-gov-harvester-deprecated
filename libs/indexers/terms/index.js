const termsIndexMappings = require('./elasticsearch_mappings_settings/mapping.json');
const termsIndexSettings = require('./elasticsearch_mappings_settings/settings.json');

function getTermsIndexConfig() {
  return {
    'esAlias': 'terms',
    'esType': 'term',
    'esMapping': termsIndexMappings,
    'esSettings': termsIndexSettings
  };
}

module.exports = getTermsIndexConfig;
