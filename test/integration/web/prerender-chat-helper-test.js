"use strict";

var testRequire = require('../test-require');

var prerenderChatHelper = testRequire('./web/prerender-chat-helper');
var assert = require('assert');

describe('prerenderChatHelper', function() {

  it('should prerender chat items, with burstStart', function() {
    var chat = {
      text: '**Moo**',
      html: '<b>Moo</b>',
      fromUser: {
        displayName: 'Billy Bob',
        username: 'squarepants'
      },
      burstStart: true
    };

    var result = prerenderChatHelper(chat, { data: { root: { } }});
    assert(result.indexOf(' burstStart ') >= 0);
  });

  it('should prerender chat items, no burstStart', function() {
    var chat = {
      text: '**Moo**',
      html: '<b>Moo</b>',
      fromUser: {
        displayName: 'Billy Bob',
        username: 'squarepants'
      }
    };

    var result = prerenderChatHelper(chat, { data: { root: { } }});
    assert(result.indexOf(' burstStart ') < 0);
  });
});
