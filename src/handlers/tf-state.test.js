const supertest = require('supertest');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const src = require('..');
const helpers = require('../helpers');
const specialPermissions = require('./special-permissions');

describe('src/handlers/tf-state', () => {
  let app;
  const testLockContainer = 'orid:1::::1:fs:test-container';

  before(() => {
    app = src.buildApp();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('using unhandled http verb returns error', () => {
    // Act / Assert
    return supertest(app)
      .patch(`/tf/${testLockContainer}`)
      .expect(404);
  });

  describe('lock', () => {
    it('when no lock present returns lock', () => {
      // Arrange
      const existsStub = sinon.stub(fs, 'exists');
      const writeStub = sinon.stub(fs, 'writeFile');
      const existsAnswer = false;
      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      writeStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .lock(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      writeStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .lock(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      unlinkStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .unlock(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      unlinkStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .unlock(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      readFileStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, stateBody);
        else cb(undefined, stateBody);
      });

      // Act / Assert
      return supertest(app)
        .get(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });

      // Act / Assert
      return supertest(app)
        .get(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      writeFileStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .post(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      unlinkStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      unlinkStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .delete(`/tf/${testLockContainer}`)
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
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      specialPermsStub.resolves();
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      unlinkStub.withArgs('/tmp/mds-test/test-container/terraform.lock').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });
      existsStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, existsAnswer);
        else cb(undefined, existsAnswer);
      });
      unlinkStub.withArgs('/tmp/mds-test/test-container/terraform.tfstate').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined);
        else cb(undefined);
      });

      // Act / Assert
      return supertest(app)
        .delete(`/tf/${testLockContainer}`)
        .expect('content-type', /application\/json/)
        .expect(200)
        .then((resp) => {
          chai.expect(resp.text).to.eql('');
          chai.expect(unlinkStub.callCount).to.eql(0);
        });
    });
  });

  /*
  describe('list containers', () => {
    it('when no special configuration present', () => {
      // Arrange
      const readDirStub = sinon.stub(fs, 'readdir');
      const lstatStub = sinon.stub(fs, 'lstat');
      const containers = ['container1', 'container2'];
      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      const specialPermsStub = sinon.stub(specialPermissions, 'get');

      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');

      specialPermsStub.resolves();

      readDirStub.withArgs('/tmp/mds-test').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, containers);
        else cb(undefined, containers);
      });
      lstatStub.withArgs('/tmp/mds-test/container1').callsFake((path, cb) => cb(undefined, { isDirectory: () => true }));
      lstatStub.withArgs('/tmp/mds-test/container2').callsFake((path, cb) => cb(undefined, { isDirectory: () => true }));

      // Act / Assert
      return supertest(app)
        .get('/v1/containers')
        .expect('content-type', /application\/json/)
        .expect(200)
        .then((resp) => {
          const body = JSON.parse(resp.text);
          chai.expect(body).to.deep.eql(containers.map((e) => ({ name: e, orid: `orid:1::::1:fs:${e}` })));
        });
    });

    it('when special configuration present', () => {
      // Arrange
      const readDirStub = sinon.stub(fs, 'readdir');
      const readFileStub = sinon.stub(fs, 'readFile');
      const lstatStub = sinon.stub(fs, 'lstat');
      const containers = ['container1', 'container2'];
      const specialCfg = {
        containers: {
          Special: {
            path: '/foo/bar',
            read: 'true',
            delete: 'false',
            writeNested: 'false',
            deleteNested: 'false',
            extensionWhitelist: [],
            extensionBlacklist: [],
          },
        },
      };

      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns('/tmp/special.json');

      readDirStub.withArgs('/tmp/mds-test').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, containers);
        else cb(undefined, containers);
      });
      readFileStub.withArgs('/tmp/special.json').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, JSON.stringify(specialCfg));
        else cb(undefined, JSON.stringify(specialCfg));
      });

      lstatStub.withArgs('/tmp/mds-test/container1').callsFake((path, cb) => cb(undefined, { isDirectory: () => true }));
      lstatStub.withArgs('/tmp/mds-test/container2').callsFake((path, cb) => cb(undefined, { isDirectory: () => true }));

      // Act / Assert
      return supertest(app)
        .get('/v1/containers')
        .expect('content-type', /application\/json/)
        .expect(200)
        .then((resp) => {
          const body = JSON.parse(resp.text);
          const expected = [...containers, 'Special'];
          chai.expect(body).to.deep.eql(expected.map((e) => ({ name: e, orid: `orid:1::::1:fs:${e}` })));
        });
    });

    it('returns 500 when error occurs', () => {
      // Arrange
      const readDirStub = sinon.stub(fs, 'readdir');

      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

      readDirStub.throws(new Error('test error'));

      // Act / Assert
      return supertest(app)
        .get('/v1/containers')
        .expect('content-type', /application\/json/)
        .expect(500)
        .then((resp) => {
          chai.expect(resp.text).to.eql('');
        });
    });
  });

  describe('create container or folder', () => {
    describe('legacy path', () => {
      it('container name already exists', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/test-container')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('container path already exists', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container/f1/f2').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/test-container/f1/f2')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('container name does not exist', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const mkdirStub = sinon.stub(fs, 'mkdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, false));
        mkdirStub.withArgs('/tmp/mds-test/test-container', { recursive: true }).callsFake((path, opts, cb) => cb(undefined));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/test-container')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(201)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({ orid: 'orid:1::::1:fs:test-container' });
          });
      });

      it('folder in container does not exist', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const mkdirStub = sinon.stub(fs, 'mkdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container/test').callsFake((path, cb) => cb(undefined, false));
        mkdirStub.withArgs('/tmp/mds-test/test-container/test', { recursive: true }).callsFake((path, opts, cb) => cb(undefined));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/test-container/test')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(201)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({ orid: 'orid:1::::1:fs:test-container/test' });
          });
      });
    });

    describe('orid path', () => {
      it('container name already exists', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('container path already exists', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container/f1/f2').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container/f1/f2')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('container name does not exist', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const mkdirStub = sinon.stub(fs, 'mkdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, false));
        mkdirStub.withArgs('/tmp/mds-test/test-container', { recursive: true }).callsFake((path, opts, cb) => cb(undefined));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(201)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({ orid: 'orid:1::::1:fs:test-container' });
          });
      });

      it('folder in container does not exist', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const mkdirStub = sinon.stub(fs, 'mkdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.withArgs('/tmp/mds-test/test-container/test').callsFake((path, cb) => cb(undefined, false));
        mkdirStub.withArgs('/tmp/mds-test/test-container/test', { recursive: true }).callsFake((path, opts, cb) => cb(undefined));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container/test')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(201)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({ orid: 'orid:1::::1:fs:test-container/test' });
          });
      });
    });
  });

  describe('upload file to container', () => {
    describe('legacy path', () => {
      it('can upload to nested folder', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);
        const saveRequestFileStub = sinon.stub(helpers, 'saveRequestFile');
        saveRequestFileStub.returns();

        existsStub.withArgs('/tmp/mds-test/test-container/f1/f2').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/upload/test-container/f1/f2')
          .attach('file', 'README.md')
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({ orid: 'orid:1::::1:fs:test-container/f1/f2/README.md' });
          });
      });
    });

    describe('orid path', () => {
      it('can upload to nested folder', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);
        const saveRequestFileStub = sinon.stub(helpers, 'saveRequestFile');
        saveRequestFileStub.returns();

        existsStub.withArgs('/tmp/mds-test/test-container/f1/f2').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/upload/orid:1::::1:fs:test-container/f1/f2')
          .attach('file', 'README.md')
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({ orid: 'orid:1::::1:fs:test-container/f1/f2/README.md' });
          });
      });
    });
  });

  describe('delete container', () => {
    describe('legacy path', () => {
      it('can delete nested folder in container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub.withArgs('/tmp/mds-test/test-container/f1/f2').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .delete('/v1/test-container/f1/f2')
          .set('Accept', 'application/json')
          .expect(204)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('can delete container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .delete('/v1/test-container')
          .set('Accept', 'application/json')
          .expect(204)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('cannot delete non-existing container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, false));

        // Act / Assert
        return supertest(app)
          .delete('/v1/test-container')
          .set('Accept', 'application/json')
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });

    describe('orid path', () => {
      it('can delete nested folder in container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub.withArgs('/tmp/mds-test/test-container/f1/f2').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container/f1/f2')
          .set('Accept', 'application/json')
          .expect(204)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('can delete container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container')
          .set('Accept', 'application/json')
          .expect(204)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('cannot delete non-existing container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub.withArgs('/tmp/mds-test/test-container').callsFake((path, cb) => cb(undefined, false));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container')
          .set('Accept', 'application/json')
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });

  describe('download file', () => {
    describe('legacy path', () => {
      it('downloads existing file', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const downloadStub = sinon.stub(helpers, 'downloadFile');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        downloadStub.withArgs(sinon.match.object, '/tmp/mds-test/test-container/file.txt', 'file.txt', sinon.match.func)
          .callsFake((res, fp, fn, cb) => {
            cb(undefined);
            res.status(200);
            res.send('');
          });

        // Act / Assert
        return supertest(app)
          .get('/v1/download/test-container/file.txt')
          .set('Accept', 'application/json')
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const downloadStub = sinon.stub(helpers, 'downloadFile');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        downloadStub.withArgs(sinon.match.object, '/tmp/mds-test/test-container/file.txt', 'file.txt', sinon.match.func)
          .callsFake((req, fp, fn, cb) => {
            cb(new Error('test error'));
          });

        // Act / Assert
        return supertest(app)
          .get('/v1/download/test-container/file.txt')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });

    describe('orid path', () => {
      it('downloads existing file', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const downloadStub = sinon.stub(helpers, 'downloadFile');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        downloadStub.withArgs(sinon.match.object, '/tmp/mds-test/test-container/file.txt', 'file.txt', sinon.match.func)
          .callsFake((res, fp, fn, cb) => {
            cb(undefined);
            res.status(200);
            res.send('');
          });

        // Act / Assert
        return supertest(app)
          .get('/v1/download/orid:1::::1:fs:test-container/file.txt')
          .set('Accept', 'application/json')
          .expect(200)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const downloadStub = sinon.stub(helpers, 'downloadFile');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        downloadStub.withArgs(sinon.match.object, '/tmp/mds-test/test-container/file.txt', 'file.txt', sinon.match.func)
          .callsFake((req, fp, fn, cb) => {
            cb(new Error('test error'));
          });

        // Act / Assert
        return supertest(app)
          .get('/v1/download/orid:1::::1:fs:test-container/file.txt')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });

  describe('list container contents', () => {
    describe('legacy path', () => {
      it('describes a containers items', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');
        const lstatStub = sinon.stub(fs, 'lstat');
        const dirItems = [
          'dir1',
          'dir2',
          'file1',
          'file2',
          '#recycle',
        ];

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        readDirStub.withArgs('/tmp/mds-test/test-container/subdir1').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, dirItems);
          else cb(undefined, dirItems);
        });

        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/dir1').callsFake((path, cb) => cb(undefined, { isDirectory: () => true, isFile: () => false }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/dir2').callsFake((path, cb) => cb(undefined, { isDirectory: () => true, isFile: () => false }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/file1').callsFake((path, cb) => cb(undefined, { isDirectory: () => false, isFile: () => true }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/file2').callsFake((path, cb) => cb(undefined, { isDirectory: () => false, isFile: () => true }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/#recycle').callsFake((path, cb) => cb(undefined, { isDirectory: () => true, isFile: () => false }));

        // Act / Assert
        return supertest(app)
          .get('/v1/list/test-container/subdir1')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({
              directories: [
                { name: 'dir1', orid: 'orid:1::::1:fs:test-container/subdir1/dir1' },
                { name: 'dir2', orid: 'orid:1::::1:fs:test-container/subdir1/dir2' },
              ],
              files: [
                { name: 'file1', orid: 'orid:1::::1:fs:test-container/subdir1/file1' },
                { name: 'file2', orid: 'orid:1::::1:fs:test-container/subdir1/file2' },
              ],
            });
          });
      });

      it('blocks read on a special denied containers contents', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');
        // const lstatStub = sinon.stub(fs, 'lstat');
        const specialPermsStub = sinon.stub(specialPermissions, 'get');

        const dirItems = [
          'dir1',
          'dir2',
          'file1',
          'file2',
          '#recycle',
        ];
        const specialCfg = {
          containers: {
            Special: {
              path: '/foo/bar',
              read: false,
              delete: false,
              writeNested: false,
              deleteNested: false,
              extensionWhitelist: [],
              extensionBlacklist: [],
            },
          },
        };

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns('/tmp/special.json');

        readDirStub.withArgs('/foo/bar').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, dirItems);
          else cb(undefined, dirItems);
        });

        specialPermsStub.resolves(specialCfg);

        // Act / Assert
        return supertest(app)
          .get('/v1/list/Special')
          .expect('content-type', /application\/json/)
          .expect(401)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        readDirStub.throws(new Error('test error'));

        // Act / Assert
        return supertest(app)
          .get('/v1/list/test-container/subdir1')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });

    describe('orid path', () => {
      it('describes a containers items', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');
        const lstatStub = sinon.stub(fs, 'lstat');
        const dirItems = [
          'dir1',
          'dir2',
          'file1',
          'file2',
          '#recycle',
        ];

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        readDirStub.withArgs('/tmp/mds-test/test-container/subdir1').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, dirItems);
          else cb(undefined, dirItems);
        });

        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/dir1').callsFake((path, cb) => cb(undefined, { isDirectory: () => true, isFile: () => false }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/dir2').callsFake((path, cb) => cb(undefined, { isDirectory: () => true, isFile: () => false }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/file1').callsFake((path, cb) => cb(undefined, { isDirectory: () => false, isFile: () => true }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/file2').callsFake((path, cb) => cb(undefined, { isDirectory: () => false, isFile: () => true }));
        lstatStub.withArgs('/tmp/mds-test/test-container/subdir1/#recycle').callsFake((path, cb) => cb(undefined, { isDirectory: () => true, isFile: () => false }));

        // Act / Assert
        return supertest(app)
          .get('/v1/list/orid:1::::1:fs:test-container/subdir1')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({
              directories: [
                { name: 'dir1', orid: 'orid:1::::1:fs:test-container/subdir1/dir1' },
                { name: 'dir2', orid: 'orid:1::::1:fs:test-container/subdir1/dir2' },
              ],
              files: [
                { name: 'file1', orid: 'orid:1::::1:fs:test-container/subdir1/file1' },
                { name: 'file2', orid: 'orid:1::::1:fs:test-container/subdir1/file2' },
              ],
            });
          });
      });

      it('blocks read on a special denied containers contents', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');
        // const lstatStub = sinon.stub(fs, 'lstat');
        const specialPermsStub = sinon.stub(specialPermissions, 'get');

        const dirItems = [
          'dir1',
          'dir2',
          'file1',
          'file2',
          '#recycle',
        ];
        const specialCfg = {
          containers: {
            Special: {
              path: '/foo/bar',
              read: false,
              delete: false,
              writeNested: false,
              deleteNested: false,
              extensionWhitelist: [],
              extensionBlacklist: [],
            },
          },
        };

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns('/tmp/special.json');

        readDirStub.withArgs('/foo/bar').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, dirItems);
          else cb(undefined, dirItems);
        });

        specialPermsStub.resolves(specialCfg);

        // Act / Assert
        return supertest(app)
          .get('/v1/list/orid:1::::1:fs:Special')
          .expect('content-type', /application\/json/)
          .expect(401)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        readDirStub.throws(new Error('test error'));

        // Act / Assert
        return supertest(app)
          .get('/v1/list/orid:1::::1:fs:test-container/subdir1')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });
  */
});
