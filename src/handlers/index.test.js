const supertest = require('supertest');
const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const src = require('..');
const helpers = require('../helpers');
const handlerHelpers = require('./handler-helpers');

describe('src/handlers/index', () => {
  let app;

  before(() => {
    app = src.buildApp();
  });

  beforeEach(() => {
    sinon.stub(handlerHelpers, 'getIssuer').returns('testIssuer');
    sinon
      .stub(handlerHelpers, 'getAppPublicSignature')
      .resolves('publicSignature');
    sinon.stub(jwt, 'verify').returns({
      payload: {
        iss: 'testIssuer',
        accountId: '1',
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('list containers', () => {
    it('returns available containers', () => {
      // Arrange
      const readDirStub = sinon.stub(fs, 'readdir');
      const lstatStub = sinon.stub(fs, 'lstat');
      const containers = ['container1', 'container2'];
      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      const existsStub = sinon.stub(fs, 'exists');

      existsStub
        .withArgs('/tmp/mds-test/1')
        .callsFake((path, cb) => cb(undefined, true));
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');

      readDirStub.withArgs('/tmp/mds-test/1').callsFake((path, opt, cb) => {
        if (cb === undefined) opt(undefined, containers);
        else cb(undefined, containers);
      });
      lstatStub
        .withArgs('/tmp/mds-test/1/container1')
        .callsFake((path, cb) => cb(undefined, { isDirectory: () => true }));
      lstatStub
        .withArgs('/tmp/mds-test/1/container2')
        .callsFake((path, cb) => cb(undefined, { isDirectory: () => true }));

      // Act / Assert
      return supertest(app)
        .get('/v1/containers')
        .set('token', 'testToken')
        .expect('content-type', /application\/json/)
        .expect(200)
        .then((resp) => {
          const body = JSON.parse(resp.text);
          chai
            .expect(body)
            .to.deep.eql(
              containers.map((e) => ({ name: e, orid: `orid:1::::1:fs:${e}` })),
            );
        });
    });

    it('returns empty list when account directory does not exist', () => {
      // Arrange
      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      const existsStub = sinon.stub(fs, 'exists');

      existsStub
        .withArgs('/tmp/mds-test/1')
        .callsFake((path, cb) => cb(undefined, false));
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');

      // Act / Assert
      return supertest(app)
        .get('/v1/containers')
        .set('token', 'testToken')
        .expect('content-type', /application\/json/)
        .expect(200)
        .then((resp) => {
          const body = JSON.parse(resp.text);
          chai.expect(body).to.deep.eql([]);
        });
    });

    it('returns 500 when error occurs', () => {
      // Arrange
      const readDirStub = sinon.stub(fs, 'readdir');
      const existsStub = sinon.stub(fs, 'exists');

      const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
      getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
      getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);
      existsStub
        .withArgs('/tmp/mds-test/1')
        .callsFake((path, cb) => cb(undefined, true));

      readDirStub.throws(new Error('test error'));

      // Act / Assert
      return supertest(app)
        .get('/v1/containers')
        .set('token', 'testToken')
        .expect('content-type', /application\/json/)
        .expect(500)
        .then((resp) => {
          chai.expect(resp.text).to.eql('');
        });
    });
  });

  describe('create container', () => {
    describe('orid path', () => {
      it('container name already exists', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub
          .withArgs('/tmp/mds-test/1/test-container')
          .callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/createContainer/test-container')
          .set('token', 'testToken')
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

        existsStub
          .withArgs('/tmp/mds-test/1/test-container')
          .callsFake((path, cb) => cb(undefined, false));
        mkdirStub
          .withArgs('/tmp/mds-test/1/test-container', { recursive: true })
          .callsFake((path, opts, cb) => cb(undefined));

        // Act / Assert
        return supertest(app)
          .post('/v1/createContainer/test-container')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(201)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai
              .expect(body)
              .to.deep.eql({ orid: 'orid:1::::1:fs:test-container' });
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const mkdirStub = sinon.stub(fs, 'mkdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub
          .withArgs('/tmp/mds-test/1/test-container')
          .callsFake((path, cb) => cb(undefined, false));
        mkdirStub.throws(new Error('test error'));

        // Act / Assert
        return supertest(app)
          .post('/v1/createContainer/test-container')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });

  describe('create folder in container', () => {
    describe('orid path', () => {
      // Act / Assert
      it('fails when missing sub path', () =>
        supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /text\/plain.*/)
          .expect(400)
          .then((resp) => {
            chai.expect(resp.text).to.eql('resource not understood');
          }));

      it('folder in container does exist', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub
          .withArgs('/tmp/mds-test/1/test-container/f1/f2')
          .callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container/f1/f2')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('folder in container does not exist', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');
        const mkdirStub = sinon.stub(fs, 'mkdir');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub
          .withArgs('/tmp/mds-test/1/test-container/test')
          .callsFake((path, cb) => cb(undefined, false));
        mkdirStub
          .withArgs('/tmp/mds-test/1/test-container/test', { recursive: true })
          .callsFake((path, opts, cb) => cb(undefined));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container/test')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(201)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai
              .expect(body)
              .to.deep.eql({ orid: 'orid:1::::1:fs:test-container/test' });
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.throws(new Error('test error'));

        // Act / Assert
        return supertest(app)
          .post('/v1/create/orid:1::::1:fs:test-container/f1/f2')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });

  describe('upload file to container', () => {
    describe('orid path', () => {
      it('can upload to nested folder', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);
        const saveRequestFileStub = sinon.stub(helpers, 'saveRequestFile');
        saveRequestFileStub.resolves();

        existsStub
          .withArgs('/tmp/mds-test/1/test-container/f1/f2')
          .callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/upload/orid:1::::1:fs:test-container/f1/f2')
          .set('token', 'testToken')
          .attach('file', 'README.md')
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({
              orid: 'orid:1::::1:fs:test-container/f1/f2/README.md',
            });
          });
      });

      it('Returns 500 when an error is thrown', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);
        const saveRequestFileStub = sinon.stub(helpers, 'saveRequestFile');
        saveRequestFileStub.throws(new Error('test error'));

        existsStub
          .withArgs('/tmp/mds-test/1/test-container/f1/f2')
          .callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .post('/v1/upload/orid:1::::1:fs:test-container/f1/f2')
          .set('token', 'testToken')
          .attach('file', 'README.md')
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.equal('');
          });
      });
    });
  });

  describe('delete container', () => {
    describe('orid path', () => {
      it('can delete nested folder in container', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const delStub = sinon.stub(helpers, 'deleteFileOrPath');
        const existsStub = sinon.stub(fs, 'exists');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        delStub.resolves();

        existsStub
          .withArgs('/tmp/mds-test/1/test-container/f1/f2')
          .callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container/f1/f2')
          .set('token', 'testToken')
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

        existsStub
          .withArgs('/tmp/mds-test/1/test-container')
          .callsFake((path, cb) => cb(undefined, true));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container')
          .set('token', 'testToken')
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

        existsStub
          .withArgs('/tmp/mds-test/1/test-container')
          .callsFake((path, cb) => cb(undefined, false));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container')
          .set('token', 'testToken')
          .set('Accept', 'application/json')
          .expect(409)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });

      it('returns 500 when error occurs', () => {
        // Arrange
        const existsStub = sinon.stub(fs, 'exists');

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        existsStub.throws(new Error('test error'));

        // Act / Assert
        return supertest(app)
          .delete('/v1/orid:1::::1:fs:test-container')
          .set('token', 'testToken')
          .send()
          .set('Accept', 'application/json')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });

  describe('download file', () => {
    describe('orid path', () => {
      it('downloads existing file', () => {
        // Arrange
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const downloadStub = sinon.stub(helpers, 'downloadFile');

        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        downloadStub
          .withArgs(
            sinon.match.object,
            '/tmp/mds-test/1/test-container/file.txt',
            'file.txt',
            sinon.match.func,
          )
          .callsFake((res, fp, fn, cb) => {
            cb(undefined);
            res.status(200);
            res.send('');
          });

        // Act / Assert
        return supertest(app)
          .get('/v1/download/orid:1::::1:fs:test-container/file.txt')
          .set('token', 'testToken')
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

        downloadStub
          .withArgs(
            sinon.match.object,
            '/tmp/mds-test/1/test-container/file.txt',
            'file.txt',
            sinon.match.func,
          )
          .callsFake((req, fp, fn, cb) => {
            cb(new Error('test error'));
          });

        // Act / Assert
        return supertest(app)
          .get('/v1/download/orid:1::::1:fs:test-container/file.txt')
          .set('token', 'testToken')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });

  describe('list container contents', () => {
    describe('orid path', () => {
      it('describes a containers items', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');
        const lstatStub = sinon.stub(fs, 'lstat');
        const dirItems = ['dir1', 'dir2', 'file1', 'file2', '#recycle'];

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        readDirStub
          .withArgs('/tmp/mds-test/1/test-container')
          .callsFake((path, opt, cb) => {
            if (cb === undefined) opt(undefined, dirItems);
            else cb(undefined, dirItems);
          });

        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/dir1')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => true, isFile: () => false }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/dir2')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => true, isFile: () => false }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/file1')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => false, isFile: () => true }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/file2')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => false, isFile: () => true }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/#recycle')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => true, isFile: () => false }),
          );

        // Act / Assert
        return supertest(app)
          .get('/v1/list/orid:1::::1:fs:test-container')
          .set('token', 'testToken')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({
              directories: [
                { name: 'dir1', orid: 'orid:1::::1:fs:test-container/dir1' },
                { name: 'dir2', orid: 'orid:1::::1:fs:test-container/dir2' },
              ],
              files: [
                { name: 'file1', orid: 'orid:1::::1:fs:test-container/file1' },
                { name: 'file2', orid: 'orid:1::::1:fs:test-container/file2' },
              ],
            });
          });
      });

      it('describes a containers sub-path items', () => {
        // Arrange
        const readDirStub = sinon.stub(fs, 'readdir');
        const lstatStub = sinon.stub(fs, 'lstat');
        const dirItems = ['dir1', 'dir2', 'file1', 'file2', '#recycle'];

        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        getEnvVarStub.withArgs('MDS_UPLOAD_FOLDER').returns('/tmp/mds-test');
        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        readDirStub
          .withArgs('/tmp/mds-test/1/test-container/subdir1')
          .callsFake((path, opt, cb) => {
            if (cb === undefined) opt(undefined, dirItems);
            else cb(undefined, dirItems);
          });

        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/subdir1/dir1')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => true, isFile: () => false }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/subdir1/dir2')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => true, isFile: () => false }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/subdir1/file1')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => false, isFile: () => true }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/subdir1/file2')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => false, isFile: () => true }),
          );
        lstatStub
          .withArgs('/tmp/mds-test/1/test-container/subdir1/#recycle')
          .callsFake((path, cb) =>
            cb(undefined, { isDirectory: () => true, isFile: () => false }),
          );

        // Act / Assert
        return supertest(app)
          .get('/v1/list/orid:1::::1:fs:test-container/subdir1')
          .set('token', 'testToken')
          .expect('content-type', /application\/json/)
          .expect(200)
          .then((resp) => {
            const body = JSON.parse(resp.text);
            chai.expect(body).to.deep.eql({
              directories: [
                {
                  name: 'dir1',
                  orid: 'orid:1::::1:fs:test-container/subdir1/dir1',
                },
                {
                  name: 'dir2',
                  orid: 'orid:1::::1:fs:test-container/subdir1/dir2',
                },
              ],
              files: [
                {
                  name: 'file1',
                  orid: 'orid:1::::1:fs:test-container/subdir1/file1',
                },
                {
                  name: 'file2',
                  orid: 'orid:1::::1:fs:test-container/subdir1/file2',
                },
              ],
            });
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
          .set('token', 'testToken')
          .expect('content-type', /application\/json/)
          .expect(500)
          .then((resp) => {
            chai.expect(resp.text).to.eql('');
          });
      });
    });
  });
});
