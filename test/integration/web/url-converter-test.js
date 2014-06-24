/*jslint node: true */
/*jshint newcap:false */
/*global describe:true, it: true */
"use strict";

var proxyquire =  require('proxyquire');
var Q = require('q');

var roomServiceStub = {
  findOrCreateRoom: function(user, uri) {
    if(uri === 'someone/repo') {
      return Q({
        troupe: {
          id: '12345'
        }
      });
    } else if(uri === 'someone') {
      return Q({
        ownUrl: true,
        troupe: {
          id: 'abcdef'
        }
      });
    } else {
      return Q();
    }
  }
};

var dummyUser = {};

var converter = proxyquire('../../../server/web/url-converter', {
  '../services/room-service': roomServiceStub
});

var assert = require("assert");

describe('mobile url converter', function() {

  it('converts a desktop chat url to a mobile chat url', function(done) {
    converter.desktopToMobile('https://gitter.im/someone/repo', dummyUser).then(function(url) {
      assert.equal(url, 'https://gitter.im/mobile/chat#12345');
    }).nodeify(done);
  });

  it('keeps the host during the conversion', function(done) {
    converter.desktopToMobile('http://localhost:5000/someone/repo', dummyUser).then(function(url) {
      assert.equal(url, 'http://localhost:5000/mobile/chat#12345');
    }).nodeify(done);
  });

  it('doesnt require a host', function(done) {
    converter.desktopToMobile('/someone/repo', dummyUser).then(function(url) {
      assert.equal(url, '/mobile/chat#12345');
    }).nodeify(done);
  });

  it('converts a desktop userhome url to a mobile userhome url', function(done) {
    converter.desktopToMobile('https://gitter.im/someone', dummyUser).then(function(url) {
      assert.equal(url, 'https://gitter.im/mobile/home');
    }).nodeify(done);
  });

  it('falls back to /mobile/chat if there is no match', function(done) {
    converter.desktopToMobile('https://gitter.im/no-room-here', dummyUser).then(function(url) {
      assert.equal(url, 'https://gitter.im/mobile/chat');
    }).nodeify(done);
  });

});
