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


describe('troupes/:id/chatMessages', function() {

  it('should create', function(done) {

    return rest.postJson(BASE_URL + 'troupes/' + troupeId  + '/chatMessages', { text: 'Rest test'}, {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(chat) {
        assert(chat.id);
        assert(chat.text, 'Rest test edited');
        assert(chat.sent);
        assert(chat.fromUser);
        assert(chat.fromUser.id);
      })
      .nodeify(done);
  });

  it('should update', function(done) {
    return rest.postJson(BASE_URL + 'troupes/' + troupeId  + '/chatMessages', { text: 'Rest test'}, {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(chat) {
        return rest.put(BASE_URL + 'troupes/' + troupeId  + '/chatMessages/' + chat.id,
          {
            data: JSON.stringify({ text: 'Rest test edited'}),
            headers: {
              Authorization: 'Bearer ' + token,
              'Content-Type': 'application/json'
            }
          })
          .then(function(chat) {
            assert(chat.id);
            assert(chat.editedAt);
            assert.equal(chat.text, 'Rest test edited');
            assert(chat.sent);
            assert(chat.fromUser);
            assert(chat.fromUser.id);
          });
      })
      .nodeify(done);
  });

  it('should index', function(done) {
    return rest.get(BASE_URL + 'troupes/' + troupeId  + '/chatMessages', {
        headers: { Authorization: 'Bearer ' + token }
      })
      .then(function(chats) {
        assert(Array.isArray(chats));
        var c0 = chats[0];
        assert(c0.id);
      })
      .nodeify(done);
  });

});


