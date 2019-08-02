'use strict';

const proxyquireNoCallThru = require('proxyquire').noCallThru();
const assert = require('assert');
const sinon = require('sinon');

describe('api-client', () => {
  describe('users', () => {
    const ajaxSpy = sinon.spy();
    const ajax = options => {
      ajaxSpy(options);
      options.success([], null, { status: 200 });
    };
    const mockJQuery = { ajax };
    const Resource = proxyquireNoCallThru('../lib/resource', {
      jquery: mockJQuery
    });
    const ApiClient = proxyquireNoCallThru('../lib/api-client', {
      './resource': Resource
    });

    it('user config to get user resource', async () => {
      const apiClient = new ApiClient({
        baseUrl: 'http://test-api-url.com',
        accessToken: 'test-token',
        getUserId: () => 'user1',
        getTroupeId: () => 'troupe1'
      });
      await apiClient.user.get('/settings');
      assert(ajaxSpy.called);
      const ajaxOptions = ajaxSpy.args[0][0];
      assert.equal(ajaxOptions.url, 'http://test-api-url.com/v1/user/user1/settings');
      assert.deepEqual(ajaxOptions.headers, { 'x-access-token': 'test-token' });
      assert.equal(ajaxOptions.type, 'get');
    });
  });
});
