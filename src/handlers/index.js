const _ = require('lodash');
const express = require('express');
const fs = require('fs');
const path = require('path');
const util = require('util');
const orid = require('@maddonkeysoftware/orid-node');

const handlerHelpers = require('./handler-helpers');
const globals = require('../globals');
const helpers = require('../helpers');

const {
  computeDiskPath,
} = require('./common');

const logger = globals.getLogger();
const router = express.Router();
const ignoreDirectories = [
  '#recycle',
  '@eaDir',
];

const oridBase = {
  provider: process.env.ORID_PROVIDER_KEY,
  service: 'fs',
};

const makeOrid = ({
  resourceId,
  accountId,
  resourceRider,
}) => orid.v1.generate(_.merge({}, oridBase, {
  resourceId,
  custom3: accountId,
  resourceRider,
  useSlashSeparator: true,
}));

const uploadFile = (request, response) => {
  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  const meta = computeDiskPath(inputOrid);

  logger.debug({ fileName: request.files.file.name, inputOrid }, 'Uploaded file');

  return Promise.resolve()
    .then(() => helpers.saveRequestFile(
      request.files.file,
      path.join(meta.path, request.files.file.name),
    )).then(() => {
      const body = {
        orid: makeOrid({
          resourceId: inputOrid.resourceId,
          accountId: inputOrid.custom3,
          resourceRider: _.filter([inputOrid.resourceRider, request.files.file.name]).join('/'),
        }),
      };
      return handlerHelpers.sendResponse(response, 200, body);
    }).catch((err) => {
      logger.warn(err);
      return handlerHelpers.sendResponse(response, 500);
    });
};

const createContainer = (request, response) => {
  const exists = util.promisify(fs.exists);
  const mkdir = util.promisify(fs.mkdir);
  const { params } = request;
  const { name } = params;

  const inputOrid = makeOrid({
    resourceId: name,
    accountId: request.parsedToken.payload.accountId,
  });
  const newContainer = computeDiskPath(orid.v1.parse(inputOrid));

  return Promise.resolve()
    .then(() => exists(newContainer.path)
      .then((doesExist) => {
        if (doesExist) {
          return handlerHelpers.sendResponse(response, 409);
        }

        return mkdir(newContainer.path, { recursive: true })
          .then(() => {
            const body = {
              orid: inputOrid,
            };
            return handlerHelpers.sendResponse(response, 201, body);
          });
      }))
    .catch((err) => {
      logger.warn(err);
      return handlerHelpers.sendResponse(response, 500);
    });
};

const createContainerPath = (request, response) => {
  const exists = util.promisify(fs.exists);
  const mkdir = util.promisify(fs.mkdir);

  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  const newContainer = computeDiskPath(inputOrid);

  return Promise.resolve()
    .then(() => exists(newContainer.path))
    .then((doesExist) => {
      if (doesExist) {
        return handlerHelpers.sendResponse(response, 409);
      }

      return mkdir(newContainer.path, { recursive: true })
        .then(() => {
          const body = {
            orid: makeOrid({
              resourceRider: inputOrid.resourceRider,
              resourceId: inputOrid.resourceId,
              accountId: request.parsedToken.payload.accountId,
            }),
          };
          return handlerHelpers.sendResponse(response, 201, body);
        });
    })
    .catch((err) => {
      logger.warn(err);
      return handlerHelpers.sendResponse(response, 500);
    });
};

const deleteContainer = (request, response) => {
  const exists = util.promisify(fs.exists);

  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  const containerMeta = computeDiskPath(inputOrid);

  return exists(containerMeta.path)
    .then((doesExist) => {
      if (!doesExist) {
        return handlerHelpers.sendResponse(response, 409);
      }

      return helpers.deleteFileOrPath(containerMeta.path, { force: true })
        .then(() => handlerHelpers.sendResponse(response, 204));
    })
    .catch((err) => {
      logger.warn(err);
      return handlerHelpers.sendResponse(response, 500);
    });
};

const downloadFile = (request, response) => {
  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  const meta = computeDiskPath(inputOrid);

  const errHandler = (err) => {
    if (err) {
      logger.warn({ err }, 'Error downloading file');
      return handlerHelpers.sendResponse(response, 500);
    }
    return Promise.resolve();
  };

  const subParts = meta.path.split('/');
  const fileName = _.nth(subParts, -1);
  return helpers.downloadFile(response, meta.path, fileName, errHandler);
};

const listContainers = (request, response) => {
  const exists = util.promisify(fs.exists);
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);
  const { accountId } = request.parsedToken.payload;
  const accountPath = path.join(helpers.getEnvVar('MDS_UPLOAD_FOLDER'), accountId);

  return exists(accountPath)
    .then((doesExist) => {
      if (!doesExist) {
        return handlerHelpers.sendResponse(response, 200, '[]');
      }

      return readdir(accountPath)
        .then((contents) => {
          const filterDirs = (name) => ignoreDirectories.indexOf(name) === -1;

          const children = contents
            .filter(filterDirs)
            .map((e) => lstat(path.join(accountPath, e)).then((r) => ({ path: e, stats: r })));

          return Promise.all(children)
            .then((items) => items.filter((e) => e.stats.isDirectory()).map((e) => e.path))
            .then((results) => _.map(results, (name) => ({
              name,
              orid: makeOrid({
                resourceId: name,
                accountId,
              }),
            })))
            .then((results) => handlerHelpers.sendResponse(response, 200, JSON.stringify(results)));
        })
        .catch((err) => {
          logger.warn(err);
          return handlerHelpers.sendResponse(response, 500);
        });
    });
};

const listContainerPath = (request, response) => {
  const readdir = util.promisify(fs.readdir);
  const lstat = util.promisify(fs.lstat);

  const inputOrid = handlerHelpers.getOridFromRequest(request, 'orid');
  const meta = computeDiskPath(inputOrid);

  return readdir(meta.path)
    .then((contents) => {
      const filterDirs = (name) => ignoreDirectories.indexOf(name) === -1;

      const children = contents
        .filter(filterDirs)
        .map((e) => lstat(path.join(meta.path, e)).then((r) => ({ path: e, stats: r })));

      return Promise.all(children)
        .then((items) => {
          const directories = items.filter((e) => e.stats.isDirectory())
            .map((e) => ({
              name: e.path,
              orid: makeOrid({
                resourceId: inputOrid.resourceId,
                accountId: inputOrid.custom3,
                resourceRider: (inputOrid.resourceRider
                  ? path.join(inputOrid.resourceRider, e.path)
                  : e.path
                ),
              }),
            }));
          const files = items.filter((e) => e.stats.isFile())
            .map((e) => ({
              name: e.path,
              orid: makeOrid({
                resourceId: inputOrid.resourceId,
                accountId: inputOrid.custom3,
                resourceRider: (inputOrid.resourceRider
                  ? path.join(inputOrid.resourceRider, e.path)
                  : e.path
                ),
              }),
            }));

          const data = { directories, files };
          return handlerHelpers.sendResponse(response, 200, JSON.stringify(data));
        });
    }).catch((err) => {
      logger.warn(err);
      return handlerHelpers.sendResponse(response, 500);
    });
};

router.post('/createContainer/:name',
  handlerHelpers.validateToken(logger),
  createContainer);
router.post('/create/:orid*',
  handlerHelpers.validateToken(logger),
  handlerHelpers.ensureRequestOrid(true, 'orid'),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  createContainerPath);
router.post('/upload/:orid*',
  handlerHelpers.validateToken(logger),
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  uploadFile);
router.delete('/:orid*',
  handlerHelpers.validateToken(logger),
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  deleteContainer);
router.get('/download/:orid*',
  handlerHelpers.validateToken(logger),
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  downloadFile);
router.get('/containers',
  handlerHelpers.validateToken(logger),
  listContainers);
router.get('/list/:orid*',
  handlerHelpers.validateToken(logger),
  handlerHelpers.ensureRequestOrid(false, 'orid'),
  handlerHelpers.canAccessResource({ oridKey: 'orid', logger }),
  listContainerPath);

module.exports = router;
