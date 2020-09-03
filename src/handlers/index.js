const _ = require('lodash');
const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');
const orid = require('@maddonkeysoftware/orid-node');

const globals = require('../globals');
const helpers = require('../helpers');
const specialPermissions = require('./special-permissions');
const {
  recombineUrlParts,
  computeDiskPath,
  getRequestOrid,
  parseForTruthy,
  sendResponse,
} = require('./common');

const logger = globals.getLogger();
const router = express.Router();
const ignoreDirectories = [
  '#recycle',
  '@eaDir',
];

const oridBase = {
  provider: process.env.MDS_FS_PROVIDER_KEY,
  custom3: 1, // TODO: Implement account
  service: 'fs',
};

const uploadFile = (request, response) => {
  const { params } = request;

  const inputOrid = getRequestOrid(params);
  const resourceId = inputOrid ? inputOrid.resourceId : params.container;

  logger.debug({ fileName: request.files.file.name, inputOrid, container: params.container }, 'Uploaded file');

  return computeDiskPath(resourceId, request.params.nestedPath, request.params)
    .then((meta) => helpers.saveRequestFile(
      request.files.file,
      path.join(meta.path, request.files.file.name),
    ))
    .then(() => {
      const body = {
        orid: orid.v1.generate(_.merge({}, oridBase, {
          resourceId,
          resourceRider: _.filter([recombineUrlParts(request.params, 'nestedPath'), request.files.file.name]).join('/'),
          useSlashSeparator: true,
        })),
      };
      return sendResponse(response, 200, body);
    })
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

const createContainer = (request, response) => {
  const exists = util.promisify(fs.exists);
  const mkdir = util.promisify(fs.mkdir);

  const { params } = request;

  const inputOrid = getRequestOrid(params);
  const resourceId = inputOrid ? inputOrid.resourceId : params.container;

  const parts = [
    helpers.getEnvVar('MDS_UPLOAD_FOLDER'),
    resourceId,
  ];

  if (inputOrid && inputOrid.resourceId && inputOrid.resourceRider) {
    parts.push(inputOrid.resourceRider);
  } else if (!inputOrid && request.params.nestedPath) {
    parts.push(recombineUrlParts(request.params, 'nestedPath'));
  }

  return exists(path.join(...parts))
    .then((doesExist) => {
      if (doesExist) {
        return sendResponse(response, 409);
      }

      // TODO: Handle nested paths
      return mkdir(path.join(...parts), { recursive: true })
        .then(() => {
          let body;
          if (inputOrid) {
            body = {
              orid: orid.v1.generate(_.merge({}, oridBase, {
                resourceRider: inputOrid.resourceRider,
                resourceId: inputOrid.resourceId,
                useSlashSeparator: true,
              })),
            };
          } else if (request.params.nestedPath) {
            body = {
              orid: orid.v1.generate(_.merge({}, oridBase, {
                resourceId,
                resourceRider: _.filter([recombineUrlParts(request.params, 'nestedPath')]).join('/'),
                useSlashSeparator: true,
              })),
            };
          } else {
            body = {
              orid: orid.v1.generate(_.merge({}, oridBase, {
                resourceId,
                useSlashSeparator: true,
              })),
            };
          }
          return sendResponse(response, 201, body);
        });
    })
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

const deleteContainer = (request, response) => {
  const exists = util.promisify(fs.exists);

  const { params } = request;

  const inputOrid = getRequestOrid(params);
  const resourceId = inputOrid ? inputOrid.resourceId : params.container;

  let getDiskPath;
  if (inputOrid) {
    if (inputOrid.resourceRider) {
      getDiskPath = computeDiskPath(resourceId, inputOrid.resourceRider);
    } else {
      getDiskPath = computeDiskPath(resourceId);
    }
  } else if (request.params.nestedPath) {
    getDiskPath = computeDiskPath(resourceId, request.params.nestedPath, request.params);
  } else {
    getDiskPath = computeDiskPath(resourceId);
  }

  return getDiskPath
    .then((meta) => exists(meta.path)
      .then((doesExist) => {
        if (!doesExist) {
          return sendResponse(response, 409);
        }

        // Are we acting upon the container and are we allowed to delete the container
        if (!request.params.nestedPath && !meta.delete) {
          return sendResponse(response, 401);
        }

        // Are we acting upon a container object and are we allowed to delete container objects
        if (request.params.nestedPath && !meta.deleteNested) {
          return sendResponse(response, 401);
        }

        // TODO: Check whitelist / black list
        return helpers.deleteFileOrPath(meta.path, { force: true })
          .then(() => sendResponse(response, 204));
      })
      .catch((err) => {
        logger.warn(err);
        return sendResponse(response, 500);
      }));
};

const downloadFile = (request, response) => {
  const { params } = request;

  const inputOrid = getRequestOrid(params);
  const resourceId = inputOrid ? inputOrid.resourceId : params.container;

  let getDiskPath;
  if (inputOrid) {
    if (inputOrid.resourceRider) {
      getDiskPath = computeDiskPath(resourceId, inputOrid.resourceRider);
    } else {
      getDiskPath = computeDiskPath(resourceId);
    }
  } else if (request.params.nestedPath) {
    getDiskPath = computeDiskPath(resourceId, request.params.nestedPath, request.params);
  } else {
    getDiskPath = computeDiskPath(resourceId);
  }

  const errHandler = (err) => {
    if (err) {
      logger.warn({ err }, 'Error downloading file');
      sendResponse(response, 500);
    }
  };

  return getDiskPath
    .then((meta) => {
      const subParts = meta.path.split('/');
      const fileName = _.nth(subParts, -1);
      helpers.downloadFile(response, meta.path, fileName, errHandler);
    })
    .catch(errHandler);
};

const listContainers = (request, response) => {
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);

  const addSpecialContainers = (base) => specialPermissions.get()
    .then((special) => {
      if (special && special.containers) {
        Object.keys(special.containers).forEach(
          (k) => parseForTruthy(special.containers[k].read) && base.push(k),
        );
      }
      return base;
    });

  return readdir(helpers.getEnvVar('MDS_UPLOAD_FOLDER'))
    .then((contents) => {
      const filterDirs = (name) => ignoreDirectories.indexOf(name) === -1;

      const children = contents
        .filter(filterDirs)
        .map((e) => lstat(path.join(helpers.getEnvVar('MDS_UPLOAD_FOLDER'), e)).then((r) => ({ path: e, stats: r })));

      return Promise.all(children)
        .then((items) => items.filter((e) => e.stats.isDirectory()).map((e) => e.path))
        .then((results) => addSpecialContainers(results))
        .then((results) => _.map(results, (name) => ({
          name,
          orid: orid.v1.generate(_.merge({}, oridBase, {
            resourceId: name,
            useSlashSeparator: true,
          })),
        })))
        .then((results) => sendResponse(response, 200, JSON.stringify(results)));
    })
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

const listContainerPath = (request, response) => {
  const { params } = request;
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);

  const inputOrid = getRequestOrid(params);
  const resourceId = inputOrid ? inputOrid.resourceId : params.container;

  let getDiskPath;
  if (inputOrid) {
    if (inputOrid.resourceRider) {
      getDiskPath = computeDiskPath(resourceId, inputOrid.resourceRider);
    } else {
      getDiskPath = computeDiskPath(resourceId);
    }
  } else if (request.params.nestedPath) {
    getDiskPath = computeDiskPath(resourceId, request.params.nestedPath, request.params);
  } else {
    getDiskPath = computeDiskPath(resourceId);
  }

  return getDiskPath
    .then((meta) => readdir(meta.path)
      .then((contents) => {
        const filterDirs = (name) => ignoreDirectories.indexOf(name) === -1;

        if (!meta.read) {
          return sendResponse(response, 401);
        }

        const children = contents
          .filter(filterDirs)
          .map((e) => lstat(path.join(meta.path, e)).then((r) => ({ path: e, stats: r })));

        const makeOrid = (name) => orid.v1.generate(_.merge({}, oridBase, {
          resourceId,
          resourceRider: _.filter([recombineUrlParts(request.params, 'nestedPath'), name]).join('/'),
          useSlashSeparator: true,
        }));

        return Promise.all(children)
          .then((items) => {
            const directories = items.filter((e) => e.stats.isDirectory())
              .map((e) => ({ name: e.path, orid: makeOrid(e.path) }));
            const files = items.filter((e) => e.stats.isFile())
              .map((e) => ({ name: e.path, orid: makeOrid(e.path) }));

            return sendResponse(response, 200, JSON.stringify({ directories, files }));
          });
      }))
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

router.post('/upload/:container', uploadFile);
router.post('/upload/:container/:nestedPath*', uploadFile);
router.post('/create/:container', createContainer);
router.post('/create/:container/:nestedPath*', createContainer);
router.delete('/:container', deleteContainer);
router.delete('/:container/:nestedPath*', deleteContainer);
router.get('/download/:container/:nestedPath*', downloadFile);
router.get('/containers', listContainers);
router.get('/list/:container', listContainerPath);
router.get('/list/:container/:nestedPath*', listContainerPath);

module.exports = router;
