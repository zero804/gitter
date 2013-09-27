/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'backbone'
], function(_, Backbone) {
  "use strict";

  /**
   * This file is VERY MUCH in a state of transition.
   *
   * TODO: complete the transition!
   */
  var ctx = window.troupeContext || {};
  var troupe;

  var context = function() {
    return ctx;
  };

  /* Unlike getTroupe() this returns a Backbone Model, upon which events can be placed, etc */
  // Note: this troupe model is not connected to the live event updates
  context.troupe = function() {
    if(!troupe) {
      var attributes;
      if(ctx.troupe) {
        attributes = ctx.troupe;
      } else {
        attributes = { id: ctx.troupeId };
      }
      troupe = new Backbone.Model(attributes);
    }

    return troupe;
  };

  context.getTroupeId = function() {
    if(troupe) return troupe.id;

    return ctx.troupe && ctx.troupe.id || ctx.troupeId;
  };

  function clearOtherAttributes(s) {
    _.each(_.keys(troupe.attributes), function(key) {
      if(!s.hasOwnProperty(key)) {
        s[key] = null;
      }
    });

    return s;
  }

  /** TEMP - lets think of a better way to do this... */
  context.setTroupeId = function(value) {
    if(troupe) {
      // Clear all attributes
      troupe.set(clearOtherAttributes({ id: value }));
      return;
    }

    ctx.troupeId = value;
    if(ctx.troupe && ctx.troupe.id !== value) {
      ctx.troupe = null;
    }
  };

  context.setTroupe = function(value) {
    if(troupe) {
      troupe.set(clearOtherAttributes(value));
      return;
    }

    var c = context();
    c.troupe = value;
  };


  context.getUserId = function() {
    var c = context();
    return c.user && c.user.id || c.userId;
  };

  context.setUser = function(value) {
    var c = context();
    c.user = value;
  };

  context.isAuthed = function() {
    var c = context();
    return c.user && c.user.id || c.userId;
  };

  context.getHomeUser = function() {
    return context().homeUser;
  };

  context.inTroupeContext = function() {
    return troupe || ctx.troupe || ctx.troupeId;
  };

  context.inOneToOneTroupeContext = function() {
    if(!context.inTroupeContext()) return false;
    if(troupe) {
      return troupe.get('oneToOne');
    }

    var t = ctx.troupe;
    return t && t.oneToOne;
  };

  context.inUserhomeContext = function() {
    // TODO: deal with this? Probably env rather than context?
    return ctx.inUserhome;
  };

  context.getUser = function() {
    return ctx.user;
  };

  context.getTroupe = function() {
    if(troupe) {
      return troupe.toJSON();
    }

    if(ctx.troupe) {
      return ctx.troupe;
    }

    if(ctx.troupeId) {
      return { id: ctx.troupeId };
    }

    return null;
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
    return context().user.status !== 'PROFILE_NOT_COMPLETED';
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
