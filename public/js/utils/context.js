/*jshint unused:strict, browser:true */
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

  context.getAuthenticated = function() {
    return !!context().user;
  };

  context.inTroupeContext = function() {
    return !!context().troupe;
  };

  context.getUser = function() {
    return context().user;
  };


  return context;

});
