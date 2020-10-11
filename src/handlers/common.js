const path = require('path');

const helpers = require('../helpers');

const computeDiskPath = (orid) => {
  const {
    resourceId,
    resourceRider,
    custom3: accountId,
  } = orid;

  const parts = [
    path.join(helpers.getEnvVar('MDS_UPLOAD_FOLDER'), accountId, resourceId),
  ];

  if (resourceRider) {
    parts.push(resourceRider);
  }

  return {
    path: path.join(...parts),
    read: true,
    delete: true,
    writeNested: true,
    deleteNested: true,
    extensionWhitelist: [],
    extensionBlacklist: [],
  };
};

module.exports = {
  computeDiskPath,
};
