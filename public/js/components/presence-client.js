define([
  'jquery',
  'underscore'
], function($, _) {
  /*global now:false, noty: false, console: false, window: false, document: false */
  "use strict";

  var onlineUsers = {};

  $(document).on('userLoggedIntoTroupe', function(event, data) {
    onlineUsers[data.userId] = true;
  });

  $(document).on('userLoggedOutOfTroupe', function(event, data) {
    delete onlineUsers[data.userId];
  });

  function refreshUsers() {
    $.ajax({
      url: "/troupes/" + window.troupeContext.troupe.id + "/users",
      contentType: "application/json",
      dataType: "json",
      type: "GET",
      success: function(data) {
        onlineUsers = {};
        for(var i = 0; i < data.length; i++) {
          if(data[i].online) {
            onlineUsers[data[i].id] = true;
          }
        }
      }
    });
  }

  refreshUsers();
  window.setInterval(refreshUsers, 10 * 60 * 1000);

  return {
    isOnline: function(id) {
      if(id == window.troupeContext.user.id) {
        return true;
      }

      return onlineUsers[id] ? true : false;
    }
  };


});
