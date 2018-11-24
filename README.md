# Code.gov Harvester

Harvester to process agency `code.json` files.

## DEPRECATION WARNING

This repository is considered deprecated and will be archived. For the new version of this tool please go to [GSA/code-gov-harvester](https://github.com/GSA/code-gov-harvester).

## Running

1. Clone repo: `$> git clone git@github.com:GSA/code-gov-harvester.git`
2. Move into the project directory
3. Install npm modules: `$> npm install`
4. Run __index.js__: `$> node index.js`

## Generated Files

Three files will be generated:

1. harvester.log: harvester log file
2. `data/release.json<timestamp>`: JSON file with all the released projects found in each agency's __code.json__.
3. `data/releaseIndex.json<timestamp>`: JSON file with the created LunrJS index
