'use strict';

process.env.DISABLE_API_LISTEN = '1';
process.env.DISABLE_API_WEB_LISTEN = '1';

const fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
const assert = require('assert');
const request = require('supertest-as-promised');
const express = require('express');
const env = require('gitter-web-env');
const nconf = env.config;

describe('handlers/settings', () => {
  let fixture = fixtureLoader.setup({
    user1: {
      accessToken: 'web-internal'
    },
    troupe1: {
      users: ['user1'],
      securityDescriptor: {
        type: null,
        members: 'PUBLIC',
        admins: 'MANUAL',
        extraAdmins: ['user1']
      }
    }
  });

  describe('integrations', () => {
    let mockWebhooksServer;
    let app;

    before(() => {
      const mockWebhooks = express();
      mockWebhooks.get(`/troupes/${fixture.troupe1._id}/hooks`, (req, res) =>
        res.status(200).send('[]')
      );
      const webhooksPort = nconf.get('test:webhooksPort');
      mockWebhooksServer = mockWebhooks.listen(webhooksPort);
      app = require('../../../server/web');
    });

    after(() => {
      mockWebhooksServer.close();
    });

    it('GET /settings/integrations/{troupe.uri} returns a list of integrations', async function() {
      this.timeout(5000);
      const response = await request(app)
        .get(`/settings/integrations/${fixture.troupe1.uri}`)
        .set('Authorization', `Bearer ${fixture.user1.accessToken}`)
        .expect(200);
      assert(/Add an Integration:/.test(response.text));
    });

    it('GET /settings/integrations/{troupe.uri} denies access to anonymous user', async function() {
      return request(app)
        .get(`/settings/integrations/${fixture.troupe1.uri}`)
        .expect(401);
    });
  });
});
