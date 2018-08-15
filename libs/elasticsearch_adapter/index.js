const ElasticSearch = require('elasticsearch');
const Logger = require('../logger');

/**
 * A logger to be used by ElasticSearch
 *
 * @class SearchLogger
 * @extends {Logger}
 */
class SearchLogger extends Logger {
  get DEFAULT_LOGGER_NAME() {
    return 'adapter-elasticsearch';
  }
}

/**
 * Represents the client that should be used for connecting to Elasticsearch
 * @class ElasticsearchAdapter
 */
class ElasticsearchAdapter {

  /**
   * Creates an instance of ElasticsearchAdapter.
   * @param {object} config object containing application configuration.
   */
  constructor(config) {
    this.client = new ElasticSearch.Client({
      hosts: this._getHostsFromConfig(config),
      log: SearchLogger
    });
  }
  _getHostsFromConfig(config) {
    let hosts = [];

    if (Array.isArray(this.config.ES_HOST)) {
      config.ES_HOST.forEach(url => {
        hosts.push(url);
      });
    } else {
      hosts.push(config.ES_HOST);
    }

    return hosts;
  }

  getClient() {
    return this.client;
  }
}

module.exports = ElasticsearchAdapter;
