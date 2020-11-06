'use strict';

const assert = require('assert');
const {
  checkForMatrixUsername,
  validateVirtualUserType,
  validateVirtualUserExternalId,
  validateVirtualUserDisplayName,
  validateVirtualUserAvatarUrl
} = require('../lib/virtual-user-service');

describe('virtual-user-service', () => {
  describe('checkForMatrixUsername', () => {
    [
      {
        name: 'Matrix ID (MXID)',
        testInput: 'madlittlemods:matrix.org',
        expectedResult: true
      },
      {
        name: 'MXID with IP and port server_name',
        testInput: 'madlittlemods:1.2.3.4:1234',
        expectedResult: true
      },
      {
        name: 'MXID with IPv6 server_name',
        testInput: 'madlittlemods:[1234:5678::abcd]',
        expectedResult: true
      },
      {
        name: 'normal username',
        testInput: 'MadLittleMods',
        expectedResult: false
      },
      {
        name: 'GitLab username',
        testInput: 'MadLittleMods_gitlab',
        expectedResult: false
      },
      {
        name: 'Twitter username',
        testInput: 'MadLittleMods_twitter',
        expectedResult: false
      },
      {
        name: 'numerical username',
        testInput: '048291294',
        expectedResult: false
      },
      {
        name: 'dot in username',
        testInput: 'Demo.user_gitlab',
        expectedResult: false
      }
    ].forEach(fixture => {
      it(fixture.name, () => {
        assert.strictEqual(checkForMatrixUsername(fixture.testInput), fixture.expectedResult);
      });
    });
  });

  describe('validateVirtualUserType', () => {
    [
      {
        name: 'normal type',
        testInput: 'matrix',
        expectedResult: true
      },
      {
        name: 'too long',
        testInput: 'x'.repeat(500),
        expectedResult: false
      },
      {
        name: 'not string',
        testInput: { foo: 'bar' },
        expectedResult: false
      }
    ].forEach(fixture => {
      it(fixture.name, () => {
        try {
          validateVirtualUserType(fixture.testInput);
          assert(fixture.expectedResult);
        } catch (err) {
          assert.equal(err.status, 400);
        }
      });
    });
  });

  describe('validateVirtualUserExternalId', () => {
    [
      {
        name: 'normal externalId',
        testInput: 'some-user:matrix.org',
        expectedResult: true
      },
      {
        name: 'too long',
        testInput: 'x'.repeat(500),
        expectedResult: false
      },
      {
        name: 'not string',
        testInput: { foo: 'bar' },
        expectedResult: false
      }
    ].forEach(fixture => {
      it(fixture.name, () => {
        try {
          validateVirtualUserExternalId(fixture.testInput);
          assert(fixture.expectedResult);
        } catch (err) {
          assert.equal(err.status, 400);
        }
      });
    });
  });

  describe('validateVirtualUserDisplayName', () => {
    [
      {
        name: 'normal display name',
        testInput: 'My name here',
        expectedResult: true
      },
      {
        name: 'too long',
        testInput: 'x'.repeat(500),
        expectedResult: false
      },
      {
        name: 'not string',
        testInput: { foo: 'bar' },
        expectedResult: false
      }
    ].forEach(fixture => {
      it(fixture.name, () => {
        try {
          validateVirtualUserDisplayName(fixture.testInput);
          assert(fixture.expectedResult);
        } catch (err) {
          assert.equal(err.status, 400);
        }
      });
    });
  });

  describe('validateVirtualUserAvatarUrl', () => {
    [
      {
        name: 'normal avatar URL',
        testInput:
          'https://matrix-client.matrix.org/_matrix/media/r0/thumbnail/matrix.org/bDayqThxTIcGNcskzIADknRv?width=30&height=30&method=crop',
        expectedResult: true
      },
      {
        name: 'okay for the avatar URL not to be passed in',
        testInput: undefined,
        expectedResult: true
      },
      {
        name: 'too long',
        testInput: 'x'.repeat(3000),
        expectedResult: false
      },
      {
        name: 'not string',
        testInput: { foo: 'bar' },
        expectedResult: false
      }
    ].forEach(fixture => {
      it(fixture.name, () => {
        try {
          validateVirtualUserAvatarUrl(fixture.testInput);
          assert(fixture.expectedResult);
        } catch (err) {
          assert.equal(err.status, 400);
        }
      });
    });
  });
});
