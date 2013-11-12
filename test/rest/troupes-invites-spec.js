/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true */
"use strict";

var rest = require('restler-q');
var assert = require('assert');
var Q = require('q');
var restUtils = require('./rest-utils');
var BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
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


describe('troupes/:id/invites', function() {

  it('should create', function(done) {
    var sentInvite = {
      email: 'testinviterecipient' + Date.now() + '@troupetest.local'
    };

    return rest.postJson(BASE_URL + '/troupes/' + troupeId  + '/invites', sentInvite, {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(invite) {
        assert(invite.id);
        assert.equal(invite.email, sentInvite.email);
      })
      .nodeify(done);
  });

  it('should delete', function(done) {
    var sentInvite = {
      email: 'testinviterecipient' + Date.now() + '@troupetest.local'
    };

    return rest.postJson(BASE_URL + '/troupes/' + troupeId  + '/invites', sentInvite, {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(invite) {
        assert(invite.id);

        return rest.del(BASE_URL + '/troupes/' + troupeId  + '/invites/' + invite.id, {
          headers: { Authorization: 'Bearer ' + token }
        });
      })
      .nodeify(done);
  });


  it('should index', function(done) {
    return rest.get(BASE_URL + '/troupes/' + troupeId  + '/invites', {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(invites) {
        assert(Array.isArray(invites));
        var i0 = invites[0];
        assert(i0.id);
      })
      .nodeify(done);
  });

});


