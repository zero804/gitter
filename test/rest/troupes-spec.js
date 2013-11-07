/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true */
"use strict";

var rest = require('restler-q');
var assert = require('assert');
var Q = require('q');
var restUtils = require('./rest-utils');
var BASE_URL = process.env.BASE_URL || 'http://localhost:5000/';
var token;
var troupeId;

before(function(done) {
  Q.all([
      restUtils.token(),
      restUtils.troupeId()
    ])
    .spread(function(ptoken, ptroupeId) {
      token = ptoken;
      troupeId = ptroupeId;
    })
    .nodeify(done);
});


describe('troupes', function() {

  it('should index', function(done) {
    return rest.get(BASE_URL + 'troupes', {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(troupes) {
        assert(Array.isArray(troupes));
        var t0 = troupes[0];
        assert(t0.id);
        assert('oneToOne' in t0);
      })
      .nodeify(done);
  });

  it('should show', function(done) {
    return rest.get(BASE_URL + 'troupes/' + troupeId, {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(troupe) {
        assert(troupe.id, 'troupe.id expected');
        assert('oneToOne' in troupe, 'troupe.oneToOne expected');
        var users = troupe.users;
        assert(users && users.length, 'troupe.users expected');
        var u0 = troupe.users[0];
        assert(u0.id, 'troupe.users.id expected');
        assert(u0.displayName, 'troupe.users.displayName expected');
      })
      .nodeify(done);
  });


});


