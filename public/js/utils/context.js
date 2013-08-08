/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone'
], function(Backbone) {
  "use strict";

  var ctx;

  var context = function() {
    if(!window.troupeContext) {
      window.troupeContext = {};
    }

    return window.troupeContext;
  };

  context.troupe = function() {

  };

  context.getTroupeId = function() {
    var c = context();
    return c.troupe && c.troupe.id || c.troupeId;
  };

  /** TEMP - lets think of a better way to do this... */
  context.setTroupeId = function(value) {
    var c = context();
    c.troupeId = value;
  };

  context.setTroupe = function(value) {
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
    return !c.user && !c.userId;
  };

  context.getHomeUser = function() {
    return context().homeUser;
  };

  context.inTroupeContext = function() {
    return !!(context().troupe || context.getTroupeId());
  };

  context.inOneToOneTroupeContext = function() {
    return context.inTroupeContext() && context.getTroupe().oneToOne;
  };

  context.inUserhomeContext = function() {
    return context().inUserhome;
  };

  context.getUser = function() {
    return context().user;
  };

  context.getTroupe = function() {
    return context().troupe || {};
  };

  context.popEvent = function(name) {
    var events = context().events;
    if(events) {
      var i = events.indexOf(name);
      if(i >= 0) {
        events.splice(i, 1);
        return true;
      }
    }
  };

  /**
   * The difference between troupeContext and env.
   * Env is static and will never change.
   * TroupeContext depends on the user and troupe
   */
  context.env = function(envName) {
    return window.troupeEnv && window.troupeEnv[envName];
  };

  return context;

});
