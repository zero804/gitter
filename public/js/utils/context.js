/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone'
], function(Backbone) {
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

  context.inUserhomeContext = function() {
    // TODO: deal with this? Probably env rather than context?
    return ctx.inUserhome;
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

  context.isProfileComplete = function() {
    return user.get('status') !== 'PROFILE_NOT_COMPLETED';
  };

  /**
   * The difference between troupeContext and env.
   * Env is static and will never change.
   * TroupeContext depends on the user and troupe
   */
  context.env = function(envName) {
    return window.troupeEnv && window.troupeEnv[envName];
  };

  context.testOnly = {
    resetTroupeContext: function(newContext) {

      ctx = newContext;
      troupe = getTroupeModel();
      user = getUserModel();

    }
  };

  try {
    document.domain = context.env('domain');
  } try(e) {
  }

  return context;

});
