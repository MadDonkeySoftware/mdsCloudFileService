const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const util = require('util');
const axios = require('axios');
const urlJoin = require('url-join');
const jwt = require('jsonwebtoken');
const memoryCache = require('memory-cache');

// https://www.terraform.io/docs/backends/types/http.html
const globals = require('../globals');
const handlerHelpers = require('./handler-helpers');
const {
  computeDiskPath,
} = require('./common');

const STATE_FILE = 'terraform.tfstate';
const LOCK_FILE = 'terraform.lock';
const logger = globals.getLogger();

const handleGet = (request, response) => {
  const exists = util.promisify(fs.exists);
  const readFile = util.promisify(fs.readFile);

  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  inputOrid.resourceRider = STATE_FILE;
  const meta = computeDiskPath(inputOrid);

  return exists(meta.path)
    .then((doesExist) => {
      if (doesExist) {
        return readFile(meta.path)
          .then((data) => handlerHelpers.sendResponse(response, 200, data));
      }
      handlerHelpers.sendResponse(response, 200);
      return undefined;
    });
};

const handlePost = (request, response) => {
  const writeFile = util.promisify(fs.writeFile);
  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  inputOrid.resourceRider = STATE_FILE;
  const meta = computeDiskPath(inputOrid);

  const { body } = request;
  return writeFile(meta.path, JSON.stringify(body))
    .then(() => handlerHelpers.sendResponse(response, 200))
    .catch((err) => {
      logger.warn({ err, inputOrid }, 'Error encountered saving TF state file.');
    });
};

const handleDelete = (request, response) => {
  const exists = util.promisify(fs.exists);
  const deleteFile = util.promisify(fs.unlink);

  const stateOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  stateOrid.resourceRider = STATE_FILE;
  const stateMeta = computeDiskPath(stateOrid);
  const lockOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  lockOrid.resourceRider = STATE_FILE;
  const lockMeta = computeDiskPath(lockOrid);

  return exists(stateMeta.path)
    .then((doesExist) => {
      if (doesExist) {
        return deleteFile(stateMeta.path);
      }
      return undefined;
    })
    .then(() => exists(lockMeta.path)
      .then((doesExist) => {
        if (doesExist) {
          return deleteFile(lockMeta.path);
        }
        return undefined;
      }))
    .then(() => handlerHelpers.sendResponse(response, 200));
};

const handleLock = (request, response) => {
  const exists = util.promisify(fs.exists);
  const writeFile = util.promisify(fs.writeFile);

  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  inputOrid.resourceRider = LOCK_FILE;
  const meta = computeDiskPath(inputOrid);

  return exists(meta.path)
    .then((doesExist) => {
      if (doesExist) {
        handlerHelpers.sendResponse(response, 423); // HTTP locked
        return undefined;
      }
      return writeFile(meta.path, JSON.stringify(request.body))
        .then(() => handlerHelpers.sendResponse(response, 200));
    });
};

const handleUnlock = (request, response) => {
  const exists = util.promisify(fs.exists);
  const deleteFile = util.promisify(fs.unlink);

  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  inputOrid.resourceRider = LOCK_FILE;
  const meta = computeDiskPath(inputOrid);

  return exists(meta.path)
    .then((doesExist) => {
      if (doesExist) {
        return deleteFile(meta.path)
          .then(() => handlerHelpers.sendResponse(response, 200));
      }
      handlerHelpers.sendResponse(response, 410);
      return undefined;
    });
};

const handleBasicAuth = (request, response, next) => {
  const { headers } = request;
  const { authorization } = headers;

  if (authorization) {
    const encoded = authorization.split(' ')[1];
    const credentials = Buffer.from(encoded, 'base64').toString('utf-8');
    const [userId, password] = credentials.split(':');

    logger.debug({ userId }, 'Attempting to authenticate user');
    const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
    const accountId = inputOrid.custom3;

    const cacheKey = `${accountId}|${userId}`;
    const cacheToken = memoryCache.get(cacheKey);

    if (cacheToken) {
      request.headers.token = cacheToken;
      return next();
    }

    const url = urlJoin(process.env.MDS_IDENTITY_URL, 'v1', 'authenticate');
    const body = {
      accountId,
      userId,
      password,
    };
    return axios.post(url, body)
      .then((resp) => {
        const { token } = resp.data;
        request.headers.token = token;
        const parsedToken = jwt.decode(token);
        const bufferMs = 5000; // 5 seconds
        const tokenExp = parsedToken.exp * 1000; // Convert to millisecond
        const exp = tokenExp - new Date().getTime() - bufferMs;
        memoryCache.put(cacheKey, resp.data.token, exp);
        return next();
      });
  }

  logger.trace({ headers }, 'basic auth handler missing authorization header');
  return next();
};

const router = express.Router();
router.use(bodyParser.json());

router.get('/tf/:orid',
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handleBasicAuth,
  handlerHelpers.validateToken(logger),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  handleGet);
router.post('/tf/:orid',
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handleBasicAuth,
  handlerHelpers.validateToken(logger),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  handlePost);
router.delete('/tf/:orid',
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handleBasicAuth,
  handlerHelpers.validateToken(logger),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  handleDelete);
router.lock('/tf/:orid',
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handleBasicAuth,
  handlerHelpers.validateToken(logger),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  handleLock);
router.unlock('/tf/:orid',
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handleBasicAuth,
  handlerHelpers.validateToken(logger),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  handleUnlock);

module.exports = router;
