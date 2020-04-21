const fs = require('fs');
const util = require('util');

const helpers = require('../helpers');

let specialPermissions;

const get = () => {
  if (!specialPermissions) {
    const specialPermsPath = helpers.getEnvVar('MDS_SPECIAL_PERMISSIONS');
    if (specialPermsPath) {
      const readFile = util.promisify(fs.readFile);
      return readFile(specialPermsPath)
        .then((buffer) => JSON.parse(buffer))
        .then((data) => { specialPermissions = data; })
        .then(() => specialPermissions);
    }
  }
  return Promise.resolve(specialPermissions);
};

const resetCache = () => {
  specialPermissions = undefined;
};

module.exports = {
  get,
  resetCache,
};
