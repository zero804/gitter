/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
], function() {
  "use strict";

  var context = function() {
    if(!window.troupeContext) {
      window.troupeContext = {};
    }
    return window.troupeContext;
  };

  context.getTroupeId = function() {
    var c = context();
    return c.troupe && c.troupe.id;
  };

  context.getUserId = function() {
    var c = context();
    return c.user && c.user.id;
  };

  context.isAuthed = function() {
    return !!context().user;
  };

  context.getHomeUser = function() {
    return context().homeUser;
  };

  context.inTroupeContext = function() {
    return !!context().troupe;
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
  }

  return context;

});
