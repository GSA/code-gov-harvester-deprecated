/**
 * Extract repositories from code.json by checking the schema version
 * @param {object} codeJson
 * @returns {array} Array with repositories / projects found in the code.json
 */
function getCodeJsonRepos(codeJson) {
  const version = getCodeJsonVersion(codeJson);
  const version2RegExp = /^2(\.\d+){0,2}$/;

  if(version2RegExp.test(version)) {
    return codeJson.releases ? codeJson.releases : null;
  } else {
    return codeJson.projects ? codeJson.projects : null;
  }
}

/**
 * Extract schema version from code.json
 * @param {object} codeJson
 */
function getCodeJsonVersion(codeJson) {
  if(codeJson.version) {
    return codeJson.version;
  } else {
    if(codeJson.agency && codeJson.projects) {
      return '1.0.1';
    } else if(codeJson.agency && codeJson.releases) {
      return '2.0.0';
    } else {
      return '1.0.0';
    }
  }
}

module.exports = {
  getCodeJsonRepos,
  getCodeJsonVersion
};
