'use strict';

var testRequire = require('../test-require');
var clientEnv = require('gitter-client-env');

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

    var result = prerenderChatHelper(chat, { data: { root: {} }, hash: {} });
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

    var result = prerenderChatHelper(chat, { data: { root: {} }, hash: {} });
    assert(result.indexOf(' burstStart ') < 0);
  });

  describe('permaLink', () => {
    const chat = {
      id: '5c94afb8b9552a27a7930fbb',
      text: '**Moo**',
      html: '<b>Moo</b>',
      fromUser: {
        displayName: 'Billy Bob',
        username: 'squarepants'
      },
      burstStart: true,
      sent: '2019-03-22T09:49:43.939Z'
    };
    const params = {
      data: {
        root: { troupeName: 'group/room' }
      },
      hash: {}
    };
    it('should prerender normal peramalink', () => {
      var result = prerenderChatHelper(chat, params);
      assert(
        result.indexOf(
          `<a class='chat-item__time js-chat-time'  href='${
            clientEnv['basePath']
          }/group/room?at=5c94afb8b9552a27a7930fbb' title=""></a>`
        ) > 0
      );
    });
    it('should prerender archive permalink', () => {
      var result = prerenderChatHelper(chat, { ...params, hash: { type: 'archive' } });
      assert(
        result.indexOf(
          `<a class='chat-item__time js-chat-time'  href='${
            clientEnv['basePath']
          }/group/room/archives/2019/03/22/?at=5c94afb8b9552a27a7930fbb' title=""></a>`
        ) > 0
      );
    });
  });
});
