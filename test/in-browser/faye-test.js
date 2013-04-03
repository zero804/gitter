/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'mocha',
  'faye'
], function($, _, expect, mocha, Faye) {
  mocha.setup({
    ui: 'bdd',
    timeout: 20000
  });

  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    message.ext = message.ext || {};
    message.ext.token = 'TEST-TOKEN-1';
    callback(message);
  };

  var userId = null;

  function getUserId(callback) {
    if(userId) return callback(userId);

    $.ajax({
      url: '/user/',
      headers: {
        'Authorization': 'Bearer TEST-TOKEN-1'
      },
      success: function(data) {
        userId = data[0].id;
        return callback(null, userId);
      },

      error: function(j,s,e) {
        return callback(e);
      }
    });

  }

  function emptyFunc() {}

  describe('Faye', function(){
    describe('.connect()', function(){
      it('should be able to connect and disconnect many times', function(done) {

        getUserId(function(err, userId) {
          if(err) return done(err);
          var COUNT = 10;
          var total = 0;

          function errorCallback(e) {
            return done(e);
          }

          function subscriptionCallback(){
            subscription.cancel();
            if(++total == COUNT) {
              done();
            }
          }

          for(var i = 0; i < COUNT; i++) {
            var client = new Faye.Client('/faye');
            client.addExtension(new ClientAuth());

            var subscription = client.subscribe('/user/' + userId, emptyFunc);
            subscription.errback(errorCallback);
            subscription.callback(subscriptionCallback);

          }

        });
      });

    });

  });

  mocha.run();

});