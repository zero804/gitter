'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';
process.env.TEST_EXPORT_RATE_LIMIT = 100;

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const proxyquireNoCallThru = require('proxyquire').noCallThru();
const request = require('supertest-as-promised')(Promise);

//const app = require('../../server/web');

const mockedRequest = require('request');
mockedRequest.get = async function(requestData, callback) {
  callback(
    null,
    {
      statusCode: 200
    },
    []
  );
};

const app = proxyquireNoCallThru('../../server/web', {
  request: mockedRequest
});

proxyquireNoCallThru('../../server/handlers/settings', {
  request: {
    get: async function(requestData, callback) {
      callback(null, {}, []);
    }
  }
});

describe('Integration settings', () => {
  const fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    userAdmin1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['userAdmin1']
      },
      users: ['user1', 'userAdmin1']
    }
  });

  it('GET /settings/integrations/<community>/<room> unauthorized is not allowed', async () => {
    await request(app)
      .get(`/settings/integrations/${fixture.troupe1.uri}`)
      .expect(401);
  });

  it('GET /settings/integrations/<community>/<room> as normal user is forbidden', async () => {
    await request(app)
      .get(`/settings/integrations/${fixture.troupe1.uri}`)
      .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
      .expect(403);
  });

  it('GET /settings/integrations/<community>/<room> as room admin gets data', async () => {
    await request(app)
      .get(`/settings/integrations/${fixture.troupe1.uri}`)
      .set('Authorization', `Bearer ${fixture.userAdmin1.accessToken}`)
      .expect(200);
  });
});
