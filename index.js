const fetch = require('node-fetch');
const Formatter = require('./libs/formatter');
const fs = require('fs');
const { getValidator } = require('@code.gov/code-gov-validator');
const JsonFile = require('jsonfile');

// const Reporter  = require('./libs/reporter');

/**
 * Fetches JSON data from supplied URL
 * @param {string} jsonUrl Valid URL from whre to fetch the JSON data
 * @returns Returns a promise object that resolves into JSON data
 */
async function getCodeJson(jsonUrl) {
  try {
    const result = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'code.gov',
        'Content-Type': 'application/json',
      }
    });
    return result.json();
  } catch(error) {
    console.error(error);
  }
}

function createIndex() {
  // Take a look at ../ code-gov-api/services/indexer/repo/index.js init()
}
function indexDocuments() {
  /**
   * Take a look at the code-gov-api project. There are some classes that are in charge
   * of indexing the different indexes and types that are created
   */
}
function optimizeIndex() {
  // Take a look at ../code-gov-api/services/indexer/index_optimizer.js init()
}
function swapIndexAlias() {
  // Take a look at ../code-gov-api/services/indexer/alias_swapper.js init()
}
function cleanIndex() {
  // Take a look at ../code-gov-api/services/indexer/index_cleaner.js init()
}
function generateStatusReport() {
  // Take a look at ../code-gov-api/services/indexer/repo/AgencyJsonStream.js
}

async function main(agencies, reporter) {
  // Create index with today's timestamp
  try {
    for(let agency of agencies) {
      const jsonData = await getCodeJson(agency.codeUrl);

      const validator = getValidator(jsonData);

      for(let repo of jsonData.releases) {
        const validationResults = await validator.validateRepo(repo, agency);
        // Calculate complaince dashboard
        // Index validation Results into status index

        const formatter = new Formatter();
        const formattedRepo = await formatter.formatRepo(repo, agency, jsonData.version);

        console.log(formattedRepo);

        // Possible flow
        // index repo
      }
    }
    // Optimize Index
    // Swap Index Alias
    // Clean Indexes
  } catch(error) {
    console.error(error);
  }
}

// logger.info('[STARTED]: Code.json processing')

// const reporter = new Reporter({REPORT_FILEPATH: './data/report.json'}, logger)
JsonFile.readFile('./data/data_sources_metadata.json', (error, agencies) => {
  main(agencies, {});
});
