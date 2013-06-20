/*jshint unused:true, browser:true */
define([
], function() {

  return {
    getTroupeId: function() {
      return window.troupeContext.troupe && window.troupeContext.troupe.id;
    },

    getUserId: function() {
      return window.troupeContext.user && window.troupeContext.user.id;
    },

    inTroupeContext: function() {
      return !!window.troupeContext.troupe;
    },

    getUser: function() {
      return window.troupeContext.user;
    }

});
