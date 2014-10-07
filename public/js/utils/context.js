define([
  'backbone',
  './qs'
], function(Backbone, qs) {
  "use strict";

  var ctx = window.troupeContext || {};

  var WatchableModel = Backbone.Model.extend({
    watch: function(event, callback, context) {
      this.on(event, callback, context);
      callback.call(context, this);
    }
  });

  function getTroupeModel() {
    var troupeModel;
    if(ctx.troupe) {
      troupeModel = ctx.troupe;
    } else if(ctx.troupeId) {
      troupeModel = { id: ctx.troupeId };
    } else if(window.cordova && window.location.pathname.indexOf('/mobile/chat') === 0) {
      /*
       * For native cordova apps, the room id is taken from the hash (or localstorage backup)
       * instead of the url.
       * This means that the we can use the same url for all rooms, and so cache one page in
       * the user's web view.
       */
      var id = window.location.hash.split('#')[1] || window.localStorage.lastTroupeId;

      if(!id) {
        window.location.pathname = '/mobile/home';
        return;
      }

      window.localStorage.lastTroupeId = id;
      troupeModel = { id: id };
    } else if(qs.troupeId) {
      troupeModel = { id: qs.troupeId };
    }

    return new WatchableModel(troupeModel);
  }

  function getUserModel() {
    var userModel;

    if(ctx.user) {
      userModel = ctx.user;
    } else if(ctx.userId) {
      userModel = { id: ctx.userId };
    }

    return new WatchableModel(userModel);
  }

  var troupe = getTroupeModel();
  var user = getUserModel();

  var context = function() {
    return ctx;
  };

  context.troupe = function() {
    return troupe;
  };

  context.getTroupeId = function() {
    return troupe.id;
  };

  function clearOtherAttributes(s, v) {
    Object.keys(v.attributes).forEach(function(key) {
      if(!s.hasOwnProperty(key)) {
        s[key] = null;
      }
    });

    return s;
  }

  /** TEMP - lets think of a better way to do this... */
  context.setTroupeId = function(value) {
    troupe.set(clearOtherAttributes({ id: value }, troupe));
    return;
  };

  context.setTroupe = function(value) {
    troupe.set(clearOtherAttributes(value, troupe));
  };


  context.getUserId = function() {
    return user.id;
  };

  context.setUser = function(value) {
    user.set(clearOtherAttributes(value, user));
  };

  context.isAuthed = function() {
    return !!user.id;
  };

  context.getHomeUser = function() {
    return context().homeUser;
  };

  context.inTroupeContext = function() {
    return !!troupe.id;
  };

  context.inOneToOneTroupeContext = function() {
    if(!context.inTroupeContext()) return false;
    return !!troupe.get('oneToOne');
  };

  /**
   * DEPRECATED
   */
  context.getUser = function() {
    return user.toJSON();
  };

  // Unlike getUser, this returns a backbone model
  context.user = function() {
    return user;
  };

  /**
   * DEPRECATED
   */
  context.getTroupe = function() {
    return troupe.toJSON();
  };

  context.popEvent = function(name) {
    var events = ctx.events;
    if(events) {
      var i = events.indexOf(name);
      if(i >= 0) {
        events.splice(i, 1);
        return true;
      }
    }
  };

  function initialiseEnv() {
    var env = window.troupeEnv || {};

    // Allow env through the querystring
    if(qs.env) {
      var m;
      try {
        m = JSON.parse(qs.env);
      } catch(e) {
        // Ignore errors here
      }

      if(m) {
        Object.keys(m).forEach(function(k) {
          env[k] = m[k];
        });
      }
    }

    return env;
  }

  // Initialise the environment
  var env = initialiseEnv();

  /**
   * The difference between troupeContext and env.
   * Env is static and will never change.
   * TroupeContext depends on the user and troupe
   */
  context.env = function(envName) {
    return env[envName];
  };

  context.getAccessToken = function(callback) {
    var iterations = 0;
    function checkToken() {
      // This is a very rough first attempt
      var token = window.bearerToken || qs.bearerToken || ctx.accessToken;
      if(token) return callback(token);

      iterations++;
      if(iterations > 50) {
        return window.location.reload(true);
      }
      setTimeout(checkToken, 100);
    }
    checkToken();
  };

  context.isLoggedIn = function() {
    // If we're in a context where one cannot be logged out...
    if(context.env('loggedIn')) return true;

    // TODO: this is not ideal. perhaps make this better
    return !!user.id;
  };

  context.onUserId = function(callback, c) {
    if(user.id) {
      callback.call(c, user.id);
    } else {
      user.once('change:id', function() {
        callback.call(c, user.id);
      });
    }
  };

  context.lang = function() {
    if(ctx.lang) return ctx.lang;
    var e = context.env('lang');
    if(e) return e;
    return [window.navigator.language];
  };

  context.testOnly = {
    resetTroupeContext: function(newContext) {

      ctx = newContext;
      troupe = getTroupeModel();
      user = getUserModel();

    }
  };

  // try {
  //   document.domain = context.env('domain');
  // } catch(e) {
  // }

  return context;

});
