const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const util = require('util');

const {
  computeDiskPath,
  getRequestOrid,
  sendResponse,
} = require('./common');

const STATE_FILE = 'terraform.tfstate';
const LOCK_FILE = 'terraform.lock';

const getRequestResourceId = (request) => {
  const { params } = request;

  const inputOrid = getRequestOrid(params);
  const resourceId = inputOrid ? inputOrid.resourceId : params.container;

  return resourceId;
};

const handleGet = (request, response) => {
  const resourceId = getRequestResourceId(request);

  const exists = util.promisify(fs.exists);
  const readFile = util.promisify(fs.readFile);
  return computeDiskPath(resourceId, STATE_FILE)
    .then((meta) => exists(meta.path)
      .then((doesExist) => {
        if (doesExist) {
          return readFile(meta.path)
            .then((data) => sendResponse(response, 200, data));
        }
        sendResponse(response, 200);
        return undefined;
      }));
};

const handlePost = (request, response) => {
  const resourceId = getRequestResourceId(request);

  const writeFile = util.promisify(fs.writeFile);
  return computeDiskPath(resourceId, STATE_FILE)
    .then((meta) => {
      const { body } = request;
      return writeFile(meta.path, JSON.stringify(body))
        .then(() => sendResponse(response, 200));
    });
};

const handleDelete = (request, response) => {
  const resourceId = getRequestResourceId(request);

  const exists = util.promisify(fs.exists);
  const deleteFile = util.promisify(fs.unlink);
  return computeDiskPath(resourceId, STATE_FILE)
    .then((meta) => exists(meta.path)
      .then((doesExist) => {
        if (doesExist) {
          return deleteFile(meta.path);
        }
        return undefined;
      }))
    .then(() => computeDiskPath(resourceId, LOCK_FILE))
    .then((meta) => exists(meta.path)
      .then((doesExist) => {
        if (doesExist) {
          return deleteFile(meta.path);
        }
        return undefined;
      }))
    .then(() => sendResponse(response, 200));
};

const handleLock = (request, response) => {
  const resourceId = getRequestResourceId(request);

  const exists = util.promisify(fs.exists);
  const writeFile = util.promisify(fs.writeFile);
  return computeDiskPath(resourceId, LOCK_FILE)
    .then((meta) => exists(meta.path)
      .then((doesExist) => {
        if (doesExist) {
          sendResponse(response, 423); // HTTP locked
          return undefined;
        }
        return writeFile(meta.path, JSON.stringify(request.body))
          .then(() => sendResponse(response, 200));
      }));
};

const handleUnlock = (request, response) => {
  const resourceId = getRequestResourceId(request);

  const lockFile = 'terraform.lock';
  const exists = util.promisify(fs.exists);
  const deleteFile = util.promisify(fs.unlink);
  return computeDiskPath(resourceId, lockFile)
    .then((meta) => exists(meta.path)
      .then((doesExist) => {
        if (doesExist) {
          return deleteFile(meta.path)
            .then(() => sendResponse(response, 200));
        }
        sendResponse(response, 410);
        return undefined;
      }));
};

const router = express.Router();
router.use(bodyParser.json());

router.get('/tf/:container', handleGet);
router.post('/tf/:container', handlePost);
router.delete('/tf/:container', handleDelete);
router.lock('/tf/:container', handleLock);
router.unlock('/tf/:container', handleUnlock);

module.exports = router;
