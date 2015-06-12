'use strict';

var fixtureLoader = require('../integration/test-fixtures');
var restful = require('../../server/services/restful');
var GitHubOrgService = require('../../server/services/github/github-org-service');

suite('restful', function() {
  set('mintime', 100);
  set('iterations', 50);

  before(function(done) {
    var g = new GitHubOrgService();
    g.getOrg('gitterHQ')
      .nodeify(done);
  });


  bench('with snappy', function(done) {
    var g = new GitHubOrgService();
    g.getOrg('gitterHQ')
      .nodeify(done);
  });

  bench('without snappy', function(done) {
    var g = new GitHubOrgService.raw();
    g.getOrg('gitterHQ')
      .nodeify(done);
  });

});
