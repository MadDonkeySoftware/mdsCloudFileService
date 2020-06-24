/* eslint-disable no-unused-expressions */

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const helpers = require('./helpers');

describe('src/helpers', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('getEnvVar', () => {
    it('Reads env vars', () => {
      const keys = ['NODE_ENV', 'NONEXISTENT'];
      _.map(keys, (k) => chai.expect(helpers.getEnvVar(k)).to.equal(process.env[k]));
    });
  });

  describe('saveRequestFile', () => {
    it('saves file', () => {
      // Arrange
      const reqFile = {
        mv: sinon.stub(),
      };

      // Act
      helpers.saveRequestFile(reqFile, '/some/path');

      // Assert
      chai.expect(reqFile.mv.calledWith('/some/path')).to.be.true;
    });
  });

  describe('deleteFileOrPath', () => {
    it('deletes file or path', () => {
      const delStub = sinon.stub().resolves();
      const localHelpers = proxyquire('./helpers', {
        del: delStub,
      });

      // Act / Assert
      localHelpers.deleteFileOrPath('/some/test/path', { force: true }).then(() => {
        chai.expect(delStub.calledWith('/some/test/path', { force: true })).to.be.true;
      });
    });
  });

  describe('downloadFile', () => {
    it('calls download on request object', () => {
      // Arrange
      const req = {
        download: sinon.stub(),
      };
      const cb = () => {};

      // Act
      helpers.downloadFile(req, '/some/path', 'file.txt', cb);

      // Assert
      chai.expect(req.download.calledWith('/some/path', 'file.txt', cb)).to.be.true;
    });
  });
});
