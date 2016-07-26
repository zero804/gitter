'use strict';

process.env.DISABLE_API_LISTEN = '1';

var assert = require('assert');
var Promise = require('bluebird');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');

describe('avatar-api', function() {
  var app, request;

  before(function() {
    request = require("supertest-as-promised")(Promise);
    app = require('../../server/api');
  });

  var fixture = fixtureLoader.setup({
    deleteDocuments: {
      User: [{ username: fixtureLoader.GITTER_INTEGRATION_USERNAME }],
      Group: [
        { lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase() }
      ],
    },
    user1: {
      username: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      gravatarImageUrl: 'https://avatars.githubusercontent.com/gitter-integration-tests?v=3'
    },
    group1: {
      uri: fixtureLoader.GITTER_INTEGRATION_USERNAME,
      lcUri: fixtureLoader.GITTER_INTEGRATION_USERNAME.toLowerCase(),
      securityDescriptor: {
        type: 'GH_USER',
        admins: 'GH_USER_SAME',
        linkPath: fixtureLoader.GITTER_INTEGRATION_USERNAME
      }
    },
    group2: {
      avatarUrl: 'http://s3.amazonaws.com/gitter-avatars/moo/cow/original',
      avatarVersion: 1,
      securityDescriptor: {
        type: null
      }
    },
  });

  var FIXTURES_TEMPLATES = [{
    name: '/group/i/:groupId',
    url: null,
    expected: null,
    proxyRedirect: '/fetch/https://avatars.githubusercontent.com/gitter-integration-tests?s=128'
  }, {
    name: '/group/i/:groupId - custom avatar',
    url: null,
    expected: null,
    proxyRedirect: '/fetch/http://s3.amazonaws.com/gitter-avatars/moo/cow/128'
  }, {
    name: '/group/iv/:version/:groupId',
    url: null,
    expected: null,
    proxyRedirect: '/fetch_lt/https://avatars.githubusercontent.com/gitter-integration-tests?s=128'
  }, {
    name: '/group/iv/:version/:groupId - custom avatar',
    url: null,
    expected: null,
    proxyRedirect: '/fetch_lt/http://s3.amazonaws.com/gitter-avatars/moo/cow/128'
  }, {
    name: '/g/u/:username',
    url: '/g/u/' + fixtureLoader.GITTER_INTEGRATION_USERNAME,
    expected: null,
    proxyRedirect: '/fetch_lt/https://avatars.githubusercontent.com/gitter-integration-tests?v=3&s=128'
  }, {
    name: '/gravatar/e/:email',
    url: '/gravatar/e/andrewn@datatribe.net',
    expected: null,
    proxyRedirect: '/fetch_lt/https://secure.gravatar.com/avatar/2644d6233d2c210258362f7f0f5138c2?s=128'
  }, {
    name: '/gravatar/m/:md5',
    url: '/gravatar/m/2644d6233d2c210258362f7f0f5138c2',
    expected: null,
    proxyRedirect: '/fetch_lt/https://secure.gravatar.com/avatar/2644d6233d2c210258362f7f0f5138c2?s=128'
  }, {
    name: '/gh/u/:username',
    url: '/gh/u/suprememoocow',
    expected: null,
    proxyRedirect: '/fetch/https://avatars.githubusercontent.com/suprememoocow?s=128'
  }, {
    name: '/gh/uv/:version/:username',
    url: '/gh/uv/3/' + fixtureLoader.GITTER_INTEGRATION_USERNAME,
    expected: null,
    proxyRedirect: '/fetch_lt/https://avatars.githubusercontent.com/gitter-integration-tests?v=3&s=128'
  }, {
    name: '/invalid_does_not_exist',
    url: '/invalid_does_not_exist',
    expected: 404,
    proxyRedirect: '/missing'
  }];

  before(function() {
    FIXTURES_TEMPLATES[0].url = '/group/i/' + fixture.group1.id;
    FIXTURES_TEMPLATES[1].url = '/group/i/' + fixture.group2.id;
    FIXTURES_TEMPLATES[2].url = '/group/iv/1/' + fixture.group1.id;
    FIXTURES_TEMPLATES[3].url = '/group/iv/1/' + fixture.group2.id;
  });

  describe('direct', function() {
    FIXTURES_TEMPLATES.forEach(function(META) {

      it('GET /private/avatars' + META.name, function() {
        return request(app)
          .get('/private/avatars' + META.url)
          .expect(META.expected || 302);
      });
    });
  });

  describe('via avatar proxy', function() {
    FIXTURES_TEMPLATES.forEach(function(META) {

      it('GET /private/avatars' + META.name, function() {
        return request(app)
          .get('/private/avatars' + META.url)
          .set('x-avatar-server', '1')
          .expect(200)
          .then(function(response) {
            assert.strictEqual(response.headers['x-accel-redirect'], META.proxyRedirect);
          })
      });
    });
  });

});
