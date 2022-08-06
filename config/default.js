module.exports = {
  fastifyOptions: {
    logger: {
      level: 'info',
      mixin: (mergeObject) => ({
        ...mergeObject,
        'event.dataset': 'mdsCloudFileService',
      }),
    },
  },

  // When true, enables the swagger interface. This should only be enabled for non-production environments.
  enableSwagger: false,

  // The location that files are persisted once uploaded.
  uploadFolder: null,

  // The port that the HTTP interface will listen upon for requests
  apiPort: 8888,

  // MDS SDK configuration
  mdsSdk: {
    identityUrl: 'http://localhost',
    account: '1',
    userId: 'admin',
    password: 'example',
  },

  // The provider element for all ORIDs created or consumed. Used in the validation process.
  oridProviderKey: 'orid',
};
