const express = require('express');
const fileUpload = require('express-fileupload');

const globals = require('./globals');
const handlers = require('./handlers');
const tfState = require('./handlers/tf-state');
const appShutdown = require('./handlers/app_shutdown');

const buildApp = () => {
  const logger = globals.getLogger();
  const app = express();

  const requestLogger = (req, res, next) => {
    logger.trace({ path: req.path, method: req.method }, 'Handling request');
    next();
  };

  const commonResponseSetup = (req, res, next) => {
    res.setHeader('content-type', 'application/json');
    next();
  };

  const configureRoutes = (expressApp) => {
    expressApp.get('/', (req, res) => {
      // TODO: Need to create help documentation and publish it here.
      res.send('{"msg":"Hello World!"}');
    });

    expressApp.use('/', tfState);
    expressApp.use('/v1/', handlers);
  };

  const fileUploadOptions = {
    safeFileNames: true,
    preserveExtension: true,
    useTempFiles: true,
    tempFileDir: '/tmp',
  };

  app.use(requestLogger);
  app.use(commonResponseSetup);
  app.use(fileUpload(fileUploadOptions));
  configureRoutes(app);
  appShutdown.wire();

  return app;
};

module.exports = {
  buildApp,
};
