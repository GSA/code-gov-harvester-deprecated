const cfenv = require('cfenv');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Get the Elasticsearch service URL. Defaults to `http://localhost:9200`
 * @param {object} cloudFoundryEnv - Cloud Foundry app environment object.
 * @returns {string} - The Elasticsearch service URL
 */
function getElasticsearchUri(cloudFoundryEnv) {
  if(!cloudFoundryEnv.isLocal){
    const elasticSearchCredentials = cloudFoundryEnv.getServiceCreds('code_gov_elasticsearch');

    return elasticSearchCredentials.uri
      ? elasticSearchCredentials.uri
      : 'http://localhost:9200';
  }
  return process.env.ES_URI ? process.env.ES_URI : 'http://localhost:9200';
}

/**
 * Gets the configured application port. Defaults to 3000
 * @param {object} cloudFoundryEnv - Cloud Foundry app environment object.
 * @returns (integer) - The application port.
 */
function getPort(cloudFoundryEnv={}) {
  return process.env.PORT
    ? process.env.PORT
    : cloudFoundryEnv.port
      ? cloudFoundryEnv.port
      : 3000;
}

/**
 * Get the necessary application directories.
 * @returns {object} - Directory paths needed by the application
 */
function getAppFilesDirectories() {
  return {
    DATA_SOURCES_MEDATA_FILE: path.join(path.dirname(__dirname), '/data/data_sources_metadata.json'),
    REPORT_FILEPATH: path.join(path.dirname(__dirname), '/data/status/report.json'),
    DISCOVERED_DIR: path.join(path.dirname(__dirname), '/data/discovered'),
    FETCHED_DIR: path.join(path.dirname(__dirname), '/data/fetched'),
    DIFFED_DIR: path.join(path.dirname(__dirname), '/data/diffed'),
    FALLBACK_DIR: path.join(path.dirname(__dirname), '/data/fallback')
  };
}

/**
 * Get the application configuration for the supplied environment
 * @param {string} env - The application environment. This will default to a development environment
 * @returns {object} - object with all the configuration needed for the environment
 */
function getConfig(env) {
  let config = {
    prod_envs: ['prod', 'production', 'stag', 'staging']
  };

  const isProd = config.prod_envs.includes(env);
  const cloudFoundryEnv = cfenv.getAppEnv();

  if(cloudFoundryEnv.isLocal) {
    dotenv.config(path.join(path.dirname(__dirname), '.env'));
  }

  config.LOGGER_LEVEL = process.env.LOGGER_LEVEL
    ? process.env.LOGGER_LEVEL
    : isProd
      ? 'INFO'
      : 'DEBUG';

  config.TERM_TYPES_TO_INDEX = [
    'name',
    'agency.name',
    'agency.acronym',
    'tags',
    'languages'];
  config.TERM_TYPES_TO_SEARCH = [
    'name',
    'agency.name',
    'agency.acronym',
    'tags',
    'languages'];
  config.supportedSchemaVersions = [
    '1.0.0',
    '1.0.1',
    '2.0.0'
  ];

  config.USE_HSTS = process.env.USE_HSTS ? process.env.USE_HSTS === 'true' : isProd;
  config.HSTS_MAX_AGE = process.env.HSTS_MAX_AGE ? parseInt(process.env.HSTS_MAX_AGE) : 31536000;
  config.HSTS_PRELOAD = false;
  config.PORT = getPort(cloudFoundryEnv);

  config.ES_HOST = getElasticsearchUri(cloudFoundryEnv);

  Object.assign(config, getAppFilesDirectories());

  return config;
}

module.exports = getConfig;
