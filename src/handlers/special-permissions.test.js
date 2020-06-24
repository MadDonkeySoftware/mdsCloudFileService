/* eslint-disable no-unused-expressions */

const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const helpers = require('../helpers');
const specialPerms = require('./special-permissions');

describe('src/helpers', () => {
  beforeEach(() => {
    specialPerms.resetCache();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {
    describe('when MDS_SPECIAL_PERMISSIONS set', () => {
      it('loads file', () => {
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');
        const readFileStub = sinon.stub(fs, 'readFile');
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

        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns('/tmp/special.json');

        readFileStub.withArgs('/tmp/special.json').callsFake((path, opt, cb) => {
          if (cb === undefined) opt(undefined, JSON.stringify(specialCfg));
          else cb(undefined, JSON.stringify(specialCfg));
        });

        return specialPerms.get().then((perms) => {
          chai.expect(perms).to.deep.equal(specialCfg);
        });
      });
    });

    describe('when MDS_SPECIAL_PERMISSIONS unset', () => {
      it('returns undefined', () => {
        const getEnvVarStub = sinon.stub(helpers, 'getEnvVar');

        getEnvVarStub.withArgs('MDS_SPECIAL_PERMISSIONS').returns(undefined);

        return specialPerms.get().then((perms) => {
          chai.expect(perms).to.deep.equal(undefined);
        });
      });
    });
  });
});
