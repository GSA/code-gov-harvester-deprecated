const moment = require('moment');
const Logger = require('../../logger');

class Indexer {

  get LOGGER_NAME() {
    return 'indexer';
  }

  constructor(adapter, params) {
    const now = moment();
    const timestamp = now.format('YYYYMMDD_HHmmss');

    this.logger = new Logger({ name: this.LOGGER_NAME });
    this.client = adapter.getClient();
    this.esAlias = params.esAlias ? params.esAlias : undefined;

    this.esIndex = params.esIndex ? params.esIndex : this.esAlias ? this.esAlias + timestamp : undefined;
    this.esType = params.esType ? params.esType : undefined;
    this.esMapping = params.esMapping ? params.esMapping : undefined;
    this.esSettings = params.esSettings ? params.esSettings : undefined;
  }

  _toTitleCase(str) {
    return str.replace(/\w\S*/g,
      function(txt){
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  async deleteIndex() {
    this.logger.debug(`Deleting index (${this.esIndex}).`);
    try {
      return await this.client.indices.delete({
        index: this.esIndex
      });
    } catch(error) {
      this.logger.trace(`ERROR deleteIndex for index: ${this.esIndex}`, error);
      throw error;
    }
  }

  async initIndex() {
    try {
      return await this.client.indices.create({
        index: this.esIndex,
        body: this.esSettings
      });
    } catch(error) {
      this.logger.trace(`ERRRO initIndex for index: ${this.esIndex}`, error);
      throw error;
    }
  }

  async indexExists() {
    try {
      return await this.client.indices.exists({
        index: this.esIndex
      });
    } catch(error) {
      this.logger.trace(`ERROR IndexExists for index ${this.esIndex}`, error);
      throw error;
    }
  }

  async indexDocument(doc) {
    try {
      return await this.client.index({
        index: this.esIndex,
        type: this.esType,
        body: doc
      });
    } catch(error) {
      this.logger.trace(error);
      throw error;
    }
  }

  initMapping() {
    this.logger.info(`Updating mapping for index (${this.esIndex}).`);

    return new Promise((resovle, reject) => {
      this.client.indices.putMapping({
        index: this.esIndex,
        type: this.esType,
        body: this.esMapping
      }, (err, response, status) => {
        if(err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(status);
          resovle(response);
        }
      });
    });
  }
}

module.exports = Indexer;
