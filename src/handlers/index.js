const _ = require('lodash');
const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');

const globals = require('../globals');
const helpers = require('../helpers');
const specialPermissions = require('./special-permissions');

const logger = globals.getLogger();
const router = express.Router();
const ignoreDirectories = [
  '#recycle',
  '@eaDir',
];

const recombineUrlParts = (params, key) => {
  const limit = 99;
  let value = params[key];
  let i = 0;

  while (params[i] && i <= limit) {
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
    if (special
        && special.containers
        && Object.keys(special.containers).indexOf(container) > -1) {
      const meta = special.containers[container];
      const parts = [
        meta.path,
      ];

      if (nestedPath) {
        parts.push(recombineUrlParts(requestParams, 'nestedPath'));
      }

      return {
        path: path.join(...parts),
        read: parseForTruthy(meta.read),
        delete: parseForTruthy(meta.delete),
        writeNested: parseForTruthy(meta.writeNested),
        deleteNested: parseForTruthy(meta.deleteNested),
        extensionWhitelist: meta.extensionWhitelist,
        extensionBlacklist: meta.extensionBlacklist,
      };
    }

    const parts = [
      helpers.getEnvVar('MDS_UPLOAD_FOLDER'),
      container,
    ];

    if (nestedPath) {
      parts.push(recombineUrlParts(requestParams, 'nestedPath'));
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
  });

const sendResponse = (response, status, body) => {
  response.status(status || 200);
  response.send(body);
  return Promise.resolve();
};

const uploadFile = (request, response) => {
  logger.debug(`Uploaded file: ${request.files.file.name}`);

  return computeDiskPath(request.params.container, request.params.nestedPath, request.params)
    .then((meta) => helpers.saveRequestFile(
      request.files.file,
      path.join(meta.path, request.files.file.name),
    ))
    .then(() => sendResponse(response))
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

const createContainer = (request, response) => {
  const exists = util.promisify(fs.exists);
  const mkdir = util.promisify(fs.mkdir);

  const parts = [
    helpers.getEnvVar('MDS_UPLOAD_FOLDER'),
    request.params.container,
  ];

  if (request.params.nestedPath) {
    parts.push(recombineUrlParts(request.params, 'nestedPath'));
  }

  return exists(path.join(...parts))
    .then((doesExist) => {
      if (doesExist) {
        return sendResponse(response, 409);
      }

      return mkdir(path.join(...parts), { recursive: true })
        .then(() => sendResponse(response, 201));
    })
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

const deleteContainer = (request, response) => {
  const exists = util.promisify(fs.exists);

  return computeDiskPath(request.params.container, request.params.nestedPath, request.params)
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
  const recombinedPath = recombineUrlParts(request.params, 'nestedPath');
  const subParts = recombinedPath.split('/');
  const fileName = _.nth(subParts, -1);

  return computeDiskPath(request.params.container, request.params.nestedPath, request.params)
    .then((meta) => helpers.downloadFile(response, meta.path, fileName, (err) => {
      if (err) {
        logger.warn({ err }, 'Error downloading file');
        sendResponse(response, 500);
      }
    }))
    .catch((err) => {
      logger.warn({ err }, 'Error downloading file');
    });
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
        .then((results) => sendResponse(response, 200, JSON.stringify(results)));
    })
    .catch((err) => {
      logger.warn(err);
      return sendResponse(response, 500);
    });
};

const listContainerPath = (request, response) => {
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);

  return computeDiskPath(request.params.container, request.params.nestedPath, request.params)
    .then((meta) => readdir(meta.path)
      .then((contents) => {
        const filterDirs = (name) => ignoreDirectories.indexOf(name) === -1;

        if (!meta.read) {
          return sendResponse(response, 401);
        }

        const children = contents
          .filter(filterDirs)
          .map((e) => lstat(path.join(meta.path, e)).then((r) => ({ path: e, stats: r })));

        return Promise.all(children)
          .then((items) => {
            const directories = items.filter((e) => e.stats.isDirectory()).map((e) => e.path);
            const files = items.filter((e) => e.stats.isFile()).map((e) => e.path);

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
