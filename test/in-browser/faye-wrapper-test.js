/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'expect',
  'assert',
  'backbone',
  'mocha',
  'components/fayeWrapper'
], function($, _, expect, assert, Backbone, mocha, FayeWrapper) {
  mocha.setup({
    ui: 'bdd'
  });

  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    if(message.channel === "/meta/handshake") {
      message.ext = message.ext || {};
      message.ext.token = 'TEST-TOKEN-1';
    }

    callback(message);
  };


  describe('FayeWrapper (real endpoint)', function(){
    describe('.connect()', function(){
      it('should be able to connect and subscribe', function(done) {

        var clientId1 = null;

        var client = new FayeWrapper('/faye');
        client.addExtension(new ClientAuth());

        var subscription = client.subscribe('/ping', function() {
        });

        var count = 0;
        subscription.callback(function() {
          setTimeout(function() {
            count++;
            if(count == 1) {
              assert(clientId1, 'Expected clientId to be non-falsey after initial connection');

              return done();
            }

            return done('Callback called too many times ' + count);
          }, 0);

        });

        subscription.errback(function() {
          return done('ERROR');
        });

        client.connect(function() {
          clientId1 = client.getClientId();
          assert(clientId1, 'Expected clientId to be non-falsey after initial connection');
        });

      });



    });

    describe('.connect()', function(){
      it('should be able to connect, subscribe and reconnect', function(done) {

        var client = new FayeWrapper('/faye');
        var clientId1 = null;
        var clientId2 = null;

        client.addExtension(new ClientAuth());

        var subscription = client.subscribe('/ping', function() {
        });

        var count = 0;
        subscription.callback(function() {
          count++;

          if(count == 1) return client.recycle(function() {
            setTimeout(function() {
              clientId2 = client.getClientId();
              assert(clientId2, 'Expected clientId to be non-falsey after second connection');
            }, 1);

          });

          if(count == 2) {
            setTimeout(function() {
              assert(clientId1, '2 Expected clientId to be non-falsey after initial connection');
              assert(clientId2, '2 Expected clientId to be non-falsey after second connection');

              assert.notEqual(clientId1, clientId2);
              return done();

            }, 0);
            return;
          }

          return done('Callback called too many times ' + count);
        });

        subscription.errback(function() {
          return done('ERROR');
        });

        client.connect(function() {
          clientId1 = client.getClientId();
          assert(clientId1, 'Expected clientId to be non-falsey after initial connection');
        });


      });

    });

  });


  describe('FayeWrapper (mock endpoint)', function() {
    var clientCount = 0;

    var MockSubscription = function(fayeMock, channel, message, context) {
      this.fayeMock = fayeMock;
      this.channel = channel;
      this.message = message.bind(context);
    };

    MockSubscription.prototype = {
      callback: function(callback, context) {
        this.callback = callback.bind(context);
        this.fayeMock.trigger('subscription:callback', this.channel, callback, context);
      },

      errback: function(callback, context) {
        this.fayeMock.trigger('subscription:errback', this.channel, callback, context);
      },

      cancel: function() {
        this.fayeMock.trigger('subscription:cancel', this.channel);
      },

      triggerCallback: function() {
        setTimeout(function() {
          if(this.callback) this.callback();
        }.bind(this), 1);
      }
    };


    var FayeMock = function() {
    };

    _.extend(FayeMock.prototype, Backbone.Events, {

      disable: function(feature) {
        this.trigger('disable', feature);
      },

      setHeader: function(name, value) {
        this.trigger('header', name, value);
      },

      getClientId: function() {
        return this.clientId;
      },

      getState: function() {
        return this.state;
      },

      connect: function(callback, context) {
        this.trigger('connect', callback, context);

        setTimeout(function() {
          this.trigger('connected');
          this.clientId = ++clientCount;
          this.state = 'CONNECTED';

          callback.apply(context);
        }.bind(this), 1);
      },

      disconnect: function() {
        this.trigger('disconnect');
      },

      subscribe: function(channel, callback, context) {
        this.trigger('subscribe', channel, callback, context);

        var subscription = new MockSubscription(this, channel, callback, context);
        if(this.state == 'CONNECTED') {
          subscription.triggerCallback();
        }
        return subscription;
      },

      unsubscribe: function(channel, callback, context) {
        this.trigger('unsubscribe', channel, callback, context);
      },

      publish: function(channel, data) {
        this.trigger('publish', channel, data);
      },

      addExtension: function(extension) {
        this.trigger('addExtension', extension);
      },

      removeExtension: function(extension) {
        this.trigger('removeExtension', extension);
      }
    });

    var EventRecorder = function(target) {
      this.events = [];

      target.on('all', function() {
        var args = Array.prototype.slice.call(arguments);
        this.events.push(args);

        console.log.apply(console, ["Event: "].concat(args[0]));
      }, this);
    };

    EventRecorder.prototype = {
      findEvents: function(event) {
        return this.events.filter(function(f) { return f[0] === event; });
      }
    };

    function mockRecorder() {
      var recorders = [];

      function mockFayeFactory(endpoint, options) {
        var f = new FayeMock(endpoint, options);
        recorders.push(new EventRecorder(f));
        return f;
      }


      recorders.mockFayeFactory = mockFayeFactory;
      return recorders;
    }

    describe('.connect()', function() {
      it('should be able to connect and subscribe', function(done) {
        var recorders = mockRecorder();

        var client = new FayeWrapper('/faye', { fayeFactory: recorders.mockFayeFactory });
        client.addExtension(new ClientAuth());
        client.connect(function() {

          var subscription = client.subscribe('/ping', function() {
          });

          var count = 0;
          subscription.callback(function() {
            var mock;
            count++;
            if(count == 1) {
              assert(recorders.length == 1, 'Expected a single mock to be created, got ' + recorders.length);
              mock = recorders[0];
              assert.equal(mock.findEvents('addExtension').length, 1, 'Expected a single connect event');
              assert.equal(mock.findEvents('connected').length, 1, 'Expected a single connect event');
              assert.equal(mock.findEvents('subscription:callback').length, 1, 'Expected a single subscribe event');

              client.recycle();
              return;
            }

            if(count == 2) {
              assert(recorders.length == 2, 'Expected a second mock to be created, got ' + recorders.length);
              assert.equal(recorders[0].findEvents('disconnect').length, 1, 'Expected the first mock to have been disconnected');
              mock = recorders[1];
              assert.equal(mock.findEvents('addExtension').length, 1, 'Expected a single connect event');
              assert.equal(mock.findEvents('connected').length, 1, 'Expected a single connect event');
              assert.equal(mock.findEvents('subscription:callback').length, 1, 'Expected a single subscribe event');

              return done();
            }

            return done('Callback called too many times ' + count);

          });

          subscription.errback(function() {
            return done('ERROR');
          });

        });

      });

    });

  });

  if (window.mochaPhantomJS) {
    mochaPhantomJS.run();
  } else {
    mocha.run();
  }

});