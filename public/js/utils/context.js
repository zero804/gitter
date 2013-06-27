/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
], function() {
  "use strict";

  var context = function() {
    return window.troupeContext || {};
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
    return context().troupe;
  };

  return context;

});
