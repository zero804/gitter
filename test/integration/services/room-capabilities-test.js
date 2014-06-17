/*jslint node:true, unused:true*/
/*global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var Q = require('q');
var testGenerator = require('../test-generator');
var moment = require('moment');

var mockito = require('jsmockito').JsMockito;

// All of our fixtures
var FIXTURES = [{
  name: 'onetoone chats have unlimited history',
  meta: {
    security: null,
    githubType: 'ONETOONE',
    expected: null,
    uri: 'URI'
  }
}, {
  name: 'public chats',
  meta: {
    security: 'PUBLIC',
    expected: null,
    uri: 'URI'
  },
  tests: [
    { name: 'public repos have unlimited history', githubType: 'REPO' },
    { name: 'public user channels have unlimited history', githubType: 'USER_CHANNEL' },
    { name: 'public org channels have unlimited history', githubType: 'ORG_CHANNEL' },
    { name: 'public repo channels have unlimited history', githubType: 'REPO_CHANNEL' }
  ]
}, {
  name: 'org accounts',
  meta: {
    security: null,
    uri: 'URI',
    githubType: 'ORG',
    plan: { URI: null }
  },
  tests: [
    { name: 'free accounts get 14 days history', plan: { URI: null }, expected: [14, 'Days'] },
    { name: 'bronze accounts get 6 months history', plan: { URI: { plan: 'bronze' } }, expected: [6, 'Months'] },
    { name: 'silver accounts get unlimited history', plan: { URI: { plan: 'silver' } }, expected: null }
  ]
}, {
  name: 'repo accounts',
  meta: {
    security: 'PRIVATE',
    uri: 'URI/REPO',
    githubType: 'REPO',
    plan: { URI: null }
  },
  tests: [
    { name: 'free accounts get 14 days history', plan: { URI: null }, expected: [14, 'Days'] },
    { name: 'bronze accounts get 6 months history', plan: { URI: { plan: 'bronze' } }, expected: [6, 'Months'] },
    { name: 'silver accounts get unlimited history', plan: { URI: { plan: 'silver' } }, expected: null }
  ]
}];


describe('room-capabilities', function() {
  testGenerator(FIXTURES, function(name, meta) {

    it(name, function(done) {
      var findByIdRequiredMock = mockito.mockFunction();
      var findActivePlanMock = mockito.mockFunction();

      var ID = 'ID' + Date.now();
      var URI = meta.uri;
      var SECURITY = meta.security;
      var GITHUBTYPE = meta.githubType;
      var EXPECTED = meta.expected;
      var PLAN = meta.plan;

      var roomCapabilities = testRequire.withProxies("./services/room-capabilities", {
        './daos/lean-troupe-dao': {
          findByIdRequired: findByIdRequiredMock
        },
        './billing-service': {
          findActivePlan: findActivePlanMock
        }
      });

      mockito.when(findByIdRequiredMock)().then(function(id) {
        return Q.fcall(function() {
          assert.strictEqual(id, ID);

          return {
            id: ID,
            uri: URI,
            security: SECURITY,
            githubType: GITHUBTYPE
          };
        });

      });

      mockito.when(findActivePlanMock)().then(function(uri) {
        return Q.fcall(function() {
          if(!PLAN || !PLAN.hasOwnProperty(uri)) {
            assert(false, 'Unexpected findActivePlan: ' + uri);
          }

          var expectedPlan = PLAN[uri];

          return expectedPlan;
        });

      });

      roomCapabilities.getMaxHistoryMessageDate(ID)
        .then(function(date) {
          if(!EXPECTED) {
            assert.strictEqual(date, EXPECTED);
            return;
          }
          var duration = moment.duration(Date.now() - date.valueOf());
          var value = Math.floor(duration['as' + EXPECTED[1]]());
          assert.strictEqual(value, EXPECTED[0]);
        })
        .nodeify(done);
    });

  });
});
