const supertest = require('supertest');
const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const memoryCache = require('memory-cache');

const src = require('..');
const helpers = require('../helpers');
const handlerHelpers = require('./handler-helpers');

const ONE_HOUR = 1000 * 60 * 60;
const getAuthString = (un, pass) => `Bearer ${Buffer.from(`${un}:${pass}`).toString('base64')}`;

describe('src/handlers/tf-state', () => {
  let app;
  const testLockContainer = 'orid:1::::1:fs:test-container';
  const identityUrl = 'http://identity-server/';

  before(() => {
    app = src.buildApp();
  });

  afterEach(() => {
    sinon.restore();
  });

  // Act / Assert
  it('using unhandled http verb returns error', () => supertest(app)
    .patch(`/tf/${testLockContainer}`)
    .expect(404));

  describe('authenticated call', () => {
    let nockIdentity;

    beforeEach(() => {
      nockIdentity = nock(identityUrl);
      process.env.MDS_IDENTITY_URL = identityUrl;
      nockIdentity.post(
        '/v1/authenticate',
        { accountId: '1', userId: 'user', password: 'pass' },
      ).reply(200, { token: 'testToken' });
      sinon.stub(jwt, 'decode').returns({
        exp: (new Date().getTime() + ONE_HOUR) / 1000,
      });
      sinon.stub(handlerHelpers, 'getAppPublicSignature').returns('publicSignature');
      sinon.stub(handlerHelpers, 'getIssuer').returns('testIssuer');
      sinon.stub(jwt, 'verify').returns({
        payload: {
          iss: 'testIssuer',
          accountId: '1',
        },
      });
      sinon.stub(memoryCache, 'get').returns();
      sinon.stub(memoryCache, 'put');
    });

    afterEach(() => {
      delete process.env.MDS_IDENTITY_URL;
    });

    describe('lock', () => {
      it('when no lock present returns lock', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const writeStub = sinon.stub(fs, 'writeFile');
        const existsAnswer = false;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        writeStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .lock(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .send({ a: 1 })
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(writeStub.callCount).to.eql(1);
          });
      });

      it('when lock present returns failure', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const writeStub = sinon.stub(fs, 'writeFile');
        const existsAnswer = true;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        writeStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .lock(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .send({ a: 1 })
          .expect('content-type', /application\/json/)
          .expect(423)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(writeStub.callCount).to.eql(0);
          });
      });
    });

    describe('unlock', () => {
      it('when lock present removes lock', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const unlinkStub = sinon.stub(fs, 'unlink');
        const existsAnswer = true;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        unlinkStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .unlock(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(unlinkStub.callCount).to.eql(1);
          });
      });

      it('when lock not present returns failure', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const unlinkStub = sinon.stub(fs, 'unlink');
        const existsAnswer = false;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        unlinkStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .unlock(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(410)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(unlinkStub.callCount).to.eql(0);
          });
      });
    });

    describe('get', () => {
      it('when state exists returns state', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const readFileStub = sinon.stub(fs, 'readFile');
        const existsAnswer = true;
        const stateBody = '{"a":1}';
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        readFileStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, stateBody);
          else cb(undefined, stateBody);
        });

        // Act / Assert
        return supertest(app)
          .get(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql(stateBody);
          });
      });

      it('when state does not exists returns nothing', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const existsAnswer = false;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });

        // Act / Assert
        return supertest(app)
          .get(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });

    describe('post', () => {
      it('writes or overwrites state', () => {
        // Arrange
        const writeFileStub = sinon.stub(fs, 'writeFile');
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        writeFileStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .post(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(writeFileStub.callCount).to.eql(1);
          });
      });
    });

    describe('delete', () => {
      it('when files present removes them', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const unlinkStub = sinon.stub(fs, 'unlink');
        const existsAnswer = true;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        unlinkStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        unlinkStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .delete(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(unlinkStub.callCount).to.eql(2);
          });
      });

      it('when files not present does nothing', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const unlinkStub = sinon.stub(fs, 'unlink');
        const existsAnswer = false;
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        unlinkStub.withArgs('/tmp/mds-test/1/test-container/terraform.lock').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });
        existsStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, existsAnswer);
          else cb(undefined, existsAnswer);
        });
        unlinkStub.withArgs('/tmp/mds-test/1/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined);
          else cb(undefined);
        });

        // Act / Assert
        return supertest(app)
          .delete(`/tf/${testLockContainer}`)
          .set('Authorization', getAuthString('user', 'pass'))
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
            chai.expect(unlinkStub.callCount).to.eql(0);
          });
      });
    });
  });
});
