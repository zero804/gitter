/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('./test-require');

var redisClient = testRequire("./utils/redis").createClient();

var assert = testRequire("assert");

describe('redis-scripting', function() {
  it('notify-lock-user-troupe', function(done) {
    var Scripto = require('redis-scripto');
    var scriptManager = new Scripto(redisClient);
    scriptManager.loadFromDir(__dirname + '/../../server/redis-lua');

    var keys    = ['k:1', 'k:2'];
    var values  = [10, 20];

    scriptManager.run('notify-lock-user-troupe', keys, values, function(err, result) {
      if(err) return done(err);

      scriptManager.run('notify-unlock-user-troupe', keys, [], function(err, result) {
        if(err) return done(err);

        scriptManager.run('notify-lock-user-troupe', keys, values, function(err, result) {
          if(err) return done(err);

          scriptManager.run('notify-unlock-user-troupe', keys, [], function(err, result) {
            if(err) return done(err);

            done();
          });
        });

      });


    });

  });

});
