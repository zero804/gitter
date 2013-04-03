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
    timeout: 2000
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

  describe('Faye', function(){
    describe('.connect()', function(){
      it('should be able to connect and disconnect many times', function(done) {

        getUserId(function(err, userId) {
          if(err) return done(err);

          var total = 0;
          for(var i = 0; i < 20; i++) {
            var client = new Faye.Client('/faye');
            client.addExtension(new ClientAuth());

            var subscription = client.subscribe('/user/' + userId, function() {});
            subscription.errback(function(e) {
              return done(e);
            });

            subscription.callback(function() {
              subscription.cancel();
              if(++total == 20) {
                done();
              }
            });

          }

        });
      });

    });

  });

  mocha.run();

});