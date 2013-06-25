/*jshint unused:strict, browser:true */
define([
], function() {
  "use strict";

  function context() {
    return window.troupeContext || {};
  }

  return {
    getTroupeId: function() {
      var c = context();
      return c.troupe && c.troupe.id;
    },

    getUserId: function() {
      var c = context();
      return c.user && c.user.id;
    },

    getAuthenticated: function() {
      return !!context().user;
    },

    inTroupeContext: function() {
      return !!context().troupe;
    },

    getUser: function() {
      return context().user;
    },

    getContext: function() {
      return context();
    }
  };

});
