const optimizeIndex = require('./index_optimizer');
const { cleanIndicesForAlias } = require('./index_cleaner');
const { aliasSwap } = require('./alias_swapper');

module.exports = {
  optimizeIndex,
  cleanIndicesForAlias,
  aliasSwap
};
