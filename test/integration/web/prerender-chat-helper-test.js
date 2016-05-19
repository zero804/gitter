"use strict";

var testRequire = require('../test-require');

var prerenderChatHelper = testRequire('./web/prerender-chat-helper');
var assert = require('assert');
var htmlparser = require("htmlparser");
var select = require('soupselect').select;

describe('prerenderChatHelper', function() {
  var handler;
  var parser;
  beforeEach(function() {
    handler = new htmlparser.DefaultHandler(null, { ignoreWhitespace: true });
    parser = new htmlparser.Parser(handler);
  });

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
    parser.parseComplete(result);

    var avatar = select(handler.dom, ".chat-item__aside .chat-item__avatar"); // Check that the avatar renders
    assert.strictEqual(avatar.length, 1);
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
    parser.parseComplete(result);

    var avatar = select(handler.dom, ".chat-item__aside .chat-item__avatar"); // Check that the avatar renders
    assert.strictEqual(avatar.length, 0);
  });
});
