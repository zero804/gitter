/*jslint node:true, unused:true*/
/*global describe:true, it:true */

"use strict";

var assert = require('assert');
var proxyquire = require('proxyquire').noCallThru();

describe('user-typeahead', function() {

  it('suggests the latest message senders, most recent first', function() {
    var typeahead = generateTypeahead({
      chatSenders: ['1-oldest', '2', '3', '4', '5', '6', '7', '8', '9', '10-newest']
    });

    typeahead.search('', function(results) {
      assert.deepEqual(usernames(results), ['10-newest','9','8','7','6','5','4','3','2','1-oldest']);
    });
  });

  it('suggests @/all to the admin', function() {
    var typeahead = generateTypeahead({
      isAdmin: true,
      chatSenders: ['1-oldest', '2', '3', '4', '5', '6', '7', '8', '9', '10-newest']
    });

    typeahead.search('', function(results) {
      assert.deepEqual(usernames(results), ['10-newest','9','8','7','6','5','4','3','2','/all']);
    });
  });

});

function generateTypeahead(options) {
  options = options || {};
  var chats = (options.chatSenders || []).map(function(sender) {
    return {
      get: function() {
        return {
          id: sender,
          username: sender
        };
      }
    };
  });

  var context = function() {
    return { permissions: { admin: !!options.isAdmin } };
  };

  context.user = function() {
    return { get: function() { return 'test-user'; } };
  };

  return proxyquire('../../../../../public/js/views/chat/typeaheads/user-typeahead', {
    'utils/is-mobile': function() { return false; },
    'utils/context': context,
    'components/apiClient': {},
    'collections/instances/integrated-items': { chats: chats },
    './tmpl/typeahead.hbs': function() {}
  });
}

function usernames(users) {
  return users.map(function(user) {
    return user.username;
  });
}
