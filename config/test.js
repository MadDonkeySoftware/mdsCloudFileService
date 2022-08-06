module.exports = {
  // The location that files are persisted once uploaded.
  uploadFolder: '/tmp/mds-test',

  // The port that the HTTP interface will listen upon for requests
  apiPort: 8888,

  // The provider element for all ORIDs created or consumed. USed int he validation process.
  oridProviderKey: 'test-provider',

  // MDS SDK configuration
  mdsSdk: {
    identityUrl: 'http://identity-server',
    account: '1',
    userId: 'test-user',
    password: 'test-password',
  },

  fastifyOptions: {
    logger: {
      level: 'fatal',
      mixin: (mergeObject) => ({
        ...mergeObject,
        'event.dataset': 'mdsCloudFileService',
      }),
    },
  },
};
