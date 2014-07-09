/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');

describe('redis-batcher', function() {
  it('should batch tasks together', function(done) {
    var RedisBatcher = testRequire('./utils/redis-batcher').RedisBatcher;

    var underTest = new RedisBatcher('test1', 0);
    var count = 0;
    underTest.listen(function(key, items, cb) {
      cb();
      count++;

      assert(items.length === 4, 'Expected 4 items');
      assert(items.indexOf('a') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));
      assert(items.indexOf('b') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));
      assert(items.indexOf('c') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));
      assert(items.indexOf('d') >= 0, 'Expected items a,b,c,d, got ' + items.join(','));

      switch(count) {
        case 1:
          underTest.add('chat:1', 'a');
          underTest.add('chat:1', 'b');
          underTest.add('chat:1', 'c');
          underTest.add('chat:1', 'd');
          break;

        case 2:
          return done();

      }

    });

    underTest.add('chat:1', 'a');
    underTest.add('chat:1', 'b');
    underTest.add('chat:1', 'c');
    underTest.add('chat:1', 'd');


  });

  it('should keep separate keys separate', function(done) {
    var RedisBatcher = testRequire('./utils/redis-batcher').RedisBatcher;

    var underTest = new RedisBatcher('test2', 0);

    var keys = {};
    underTest.listen(function(key, items, cb) {
      cb();
      keys[key] = true;

      assert(items.length === 2, 'Expected 2 items');

      if(key === 'chat:1') {
        assert(items.indexOf('a') >= 0, 'Expected items a,b got ' + items.join(','));
        assert(items.indexOf('b') >= 0, 'Expected items a,b got ' + items.join(','));
      } else {
        assert(items.indexOf('c') >= 0, 'Expected items c,d, got ' + items.join(','));
        assert(items.indexOf('d') >= 0, 'Expected items c,d, got ' + items.join(','));
      }

      if(keys['chat:1'] && keys['chat:2']) {
        return done();
      }

    });

    underTest.add('chat:1', 'a');
    underTest.add('chat:1', 'b');
    underTest.add('chat:2', 'c');
    underTest.add('chat:2', 'd');


  });
});