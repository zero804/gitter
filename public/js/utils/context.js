/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  "use strict";

  var ctx = window.troupeContext || {};
  var troupe, user;

  (function() {
    var troupeModel, userModel;
    if(ctx.troupe) {
      troupeModel = ctx.troupe;
    } else if(ctx.troupeId) {
      troupeModel = { id: ctx.troupeId };
    }

    if(ctx.user) {
      userModel = ctx.user;
    } else if(ctx.userId) {
      userModel = { id: ctx.userId };
    }

    troupe = new Backbone.Model(troupeModel);
    user = new Backbone.Model(userModel);
  })();

  var context = function() {
    return ctx;
  };

  /* Unlike getTroupe() this returns a Backbone Model, upon which events can be placed, etc */
  // Note: this troupe model is not connected to the live event updates
  context.troupe = function() {
    return troupe;
  };

  context.getTroupeId = function() {
    return troupe.id;
  };

  function clearOtherAttributes(s, v) {
    _.each(_.keys(v.attributes), function(key) {
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

  context.getUser = function() {
    return user.toJSON();
  };

  // Unlike getUser, this returns a backbone model
  context.user = function() {
    return user;
  };

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
      troupe = null;
      ctx = newContext;
    }
  };

  return context;

});
