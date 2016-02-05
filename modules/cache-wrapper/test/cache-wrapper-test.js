"use strict";

var assert = require('assert');
var Promise = require('bluebird');
var proxyquireNoCallThru = require("proxyquire").noCallThru();

function getWrapper(lookupFunc) {
  var MockSnappyCache = function() {};
  MockSnappyCache.prototype.lookup = lookupFunc;
  return proxyquireNoCallThru('../lib/cache-wrapper', {
    'snappy-cache': MockSnappyCache
  });
}

describe('cache-wrapper', function() {

  describe('wrapping single function modules', function() {

    var module = function(name) {
      return Promise.resolve('hello ' + name);
    };

    it('looks up correct key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module:::world');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped('world');
    });

    it('encodes colons (eww, gross!) in the key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module:::look%3Aat%3Amy%3Acolons');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped('look:at:my:colons');
    });

    it('calls function correctly on cache miss', function(done) {
      var wrapper = getWrapper(function(key, cachedFunc, cb) {
        cachedFunc(cb);
      });

      var wrapped = wrapper('my-module', module);
      wrapped('world').then(function(result) {
        assert.equal(result, 'hello world');
        done();
      });
    });

  });

  describe('wrapping multi function modules', function() {

    var module = {
      addPrefix: function(name) {
        return Promise.resolve('hello ' + name);
      }
    };

    it('looks up correct key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module::addPrefix:world');
        done();
      });

      var wrapped = wrapper('my-module', module);
      wrapped.addPrefix('world');
    });

    it('calls function correctly on cache miss', function(done) {
      var wrapper = getWrapper(function(key, cachedFunc, cb) {
        cachedFunc(cb);
      });

      var wrapped = wrapper('my-module', module);
      wrapped.addPrefix('world').then(function(result) {
        assert.equal(result, 'hello world');
        done();
      });
    });

  });

  describe('wrapping class modules', function() {

    var Klass = function(prefix) {
      this.prefix = prefix;
    };
    Klass.prototype.addPrefix = function(name) {
      return Promise.resolve(this.prefix + ' ' + name);
    };

    it('looks up correct key', function(done) {
      var wrapper = getWrapper(function(key) {
        assert.equal(key, 'my-module:hello:addPrefix:world');
        done();
      });

      var Wrapped = wrapper('my-module', Klass, {
        getInstanceId: function(obj) {
          return obj.prefix;
        }
      });

      var wrapped = new Wrapped('hello');
      wrapped.addPrefix('world');
    });

    it('calls method correctly on cache miss', function(done) {
      var wrapper = getWrapper(function(key, cachedFunc, cb) {
        cachedFunc(cb);
      });

      var Wrapped = wrapper('my-module', Klass, {
        getInstanceId: function(obj) {
          return obj.prefix;
        }
      });
      var wrapped = new Wrapped('hello');
      wrapped.addPrefix('world').then(function(result) {
        assert.equal(result, 'hello world');
        done();
      });
    });

  });

});
