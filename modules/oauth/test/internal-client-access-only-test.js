'use strict';

const assert = require('assert');
const internalClientAccessOnly = require('../lib/internal-client-access-only');

describe('internal-client-access-only', () => {
  const FIXTURES = [
    {
      name: 'null is not an internal client',
      client: null,
      result: false
    },
    {
      name: 'invalid client is not an internal client',
      client: {},
      result: false
    },
    {
      name: 'an arbitrary client is not internal client',
      client: { clientKey: 'bob', canSkipAuthorization: false },
      result: false
    },
    {
      name: 'clients who canSkipAuthorization are internal',
      client: { clientKey: 'bob', canSkipAuthorization: true },
      result: true
    },
    {
      name: 'web-internal is internal',
      client: { clientKey: 'web-internal' },
      result: true
    }
  ];

  FIXTURES.forEach(function(meta) {
    it(meta.name, function() {
      var result = internalClientAccessOnly.isRequestFromInternalClient({
        authInfo: {
          client: meta.client
        }
      });

      assert.strictEqual(result, meta.result);
    });
  });
});
