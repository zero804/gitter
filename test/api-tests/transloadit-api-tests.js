"use strict";

process.env.DISABLE_API_LISTEN = '1';

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var assert = require('assert');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('transloadit-api-tests #slow', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
      Group: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() }],
      Troupe: [{ lcUri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY.toLowerCase() + '/lobby' }]
    },
    user1: {
      githubToken: fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN,
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      accessToken: 'web-internal'
    },
    group1: {
      uri: fixtureLoader.GITTER_INTEGRATION_COMMUNITY,
      securityDescriptor: {
        extraAdmins: ['user1']
      }
    },
    troupe1: {
      security: 'PUBLIC',
      group: 'group1'
    }
  });

  it('GET /private/generate-signature (group avatar)', function() {
    return request(app)
      .get('/private/generate-signature')
      .query({
        type: 'avatar',
        group_uri: fixture.group1.uri,
        group_id: fixture.group1.id
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var params = JSON.parse(result.body.params);

        // test that type avatar became the correct template_id
        assert.strictEqual(params.template_id, nconf.get('transloadit:template_avatar_id'));

        var originalPath = 'groups/' + fixture.group1.id + '/original';
        var thumbsPath = 'groups/' + fixture.group1.id + '/${file.meta.width}';
        assert.strictEqual(params.steps.export_original.path, originalPath);
        assert.strictEqual(params.steps.export_thumbs.path, thumbsPath);
      });
  });

  it('GET /private/generate-signature (room image)', function() {
    return request(app)
      .get('/private/generate-signature')
      .query({
        type: 'image',
        room_uri: fixture.troupe1.uri,
        room_id: fixture.troupe1.id
      })
      .set('x-access-token', fixture.user1.accessToken)
      .expect(200)
      .then(function(result) {
        var params = JSON.parse(result.body.params);

        // test that type image became the correct template_id
        assert.strictEqual(params.template_id, nconf.get('transloadit:template_image_id'));

        // these don't change for rooms, but at least checking them means we
        // went down the right path
        var originalPath = '${fields.room_uri}/${fields.token}/${file.url_name}';
        var thumbsPath = '${fields.room_uri}/${fields.token}/thumb/${file.url_name}';
        assert.strictEqual(params.steps.export_originals.path, originalPath);
        assert.strictEqual(params.steps.export_thumbs.path, thumbsPath);
      });
  });
});

