'use strict';

const assert = require('assert');
const approvedBridgeClientAccessOnly = require('../lib/approved-bridge-client-access-only');

describe('approved-bridge-client-access-only', () => {
  const FIXTURES = [
    {
      name: 'allows approved bridge client',
      client: {
        clientKey: 'matrix-bridge-test'
      },
      virtualUser: {
        type: 'matrix'
      },
      result: true
    },
    {
      name: 'deny other clients',
      client: {
        clientKey: 'other-oauth-client'
      },
      virtualUser: {
        type: 'matrix'
      },
      result: false
    },
    {
      name: 'deny bridge client where virtual user type does not match',
      client: {
        clientKey: 'matrix-bridge-test'
      },
      virtualUser: {
        type: 'my-random-service'
      },
      result: false
    }
  ];

  before(() => {
    approvedBridgeClientAccessOnly.testOnly.approvedClientKeyMap['matrix-bridge-test'] = 'matrix';
  });

  FIXTURES.forEach(function(meta) {
    it(meta.name, () => {
      const result = approvedBridgeClientAccessOnly.isRequestFromApprovedBridgeClient(
        {
          authInfo: {
            client: meta.client
          }
        },
        meta.virtualUser
      );

      assert.strictEqual(result, meta.result);
    });
  });
});
