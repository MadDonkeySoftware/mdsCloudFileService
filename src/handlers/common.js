const _ = require('lodash');
const path = require('path');
const orid = require('@maddonkeysoftware/orid-node');

const helpers = require('../helpers');
const specialPermissions = require('./special-permissions');

const recombineUrlParts = (params, key) => {
  let value = params[key];
  let i = 0;

  while (params[i] && i <= Number.MAX_SAFE_INTEGER) {
    value += params[i];
    i += 1;
  }

  return value;
};

const parseForTruthy = (value) => {
  if (typeof value === 'boolean') return value;
  return value.toString().toLowerCase() === 'true';
};

const computeDiskPath = (container, nestedPath, requestParams) => specialPermissions.get()
  .then((special) => {
    const defaultContainer = {
      path: path.join(helpers.getEnvVar('MDS_UPLOAD_FOLDER'), container),
      read: true,
      delete: true,
      writeNested: true,
      deleteNested: true,
      extensionWhitelist: [],
      extensionBlacklist: [],
    };
    const containerMeta = _.get(_.get(special, ['containers']), [container]) || defaultContainer;
    const parts = [
      containerMeta.path,
    ];

    if (nestedPath && requestParams) {
      parts.push(recombineUrlParts(requestParams, 'nestedPath'));
    } else if (nestedPath) {
      parts.push(nestedPath);
    }

    return {
      path: path.join(...parts),
      read: parseForTruthy(containerMeta.read),
      delete: parseForTruthy(containerMeta.delete),
      writeNested: parseForTruthy(containerMeta.writeNested),
      deleteNested: parseForTruthy(containerMeta.deleteNested),
      extensionWhitelist: containerMeta.extensionWhitelist,
      extensionBlacklist: containerMeta.extensionBlacklist,
    };
  });

const sendResponse = (response, status, body) => {
  response.status(status || 200);
  response.send(body);
  return Promise.resolve();
};

const getRequestOrid = (params, containerKey = 'container', nestedPathKey = 'nestedPath') => {
  const fullUrlOrid = _.filter([params[containerKey], recombineUrlParts(params, nestedPathKey)]).join('/');
  return orid.v1.isValid(fullUrlOrid) ? orid.v1.parse(fullUrlOrid) : undefined;
};

module.exports = {
  recombineUrlParts,
  getRequestOrid,
  sendResponse,
  computeDiskPath,
  parseForTruthy,
};
