define([
  'jquery',
  'underscore'
], function($, _) {
  /*global now:false, noty: false, console: false, window: false, document: false */
  "use strict";

  var onlineUsers = {};

  function updateAvatars(id, online) {
    if(online) {
      $('.offline.avatar-' + id).removeClass('offline');
    } else {
      $('.avatar-' + id).addClass('offline');
    }
  }

  $(document).on('userLoggedIntoTroupe', function(event, data) {
    onlineUsers[data.userId] = true;
    updateAvatars(data.userId, true);
  });

  $(document).on('userLoggedOutOfTroupe', function(event, data) {
    delete onlineUsers[data.userId];
    updateAvatars(data.userId, false);
  });

  function refreshUsers() {
    $.ajax({
      url: "/troupes/" + window.troupeContext.troupe.id + "/users",
      contentType: "application/json",
      dataType: "json",
      type: "GET",
      success: function(data) {
        var oldOnlineUsers = onlineUsers;
        onlineUsers = {};
        for(var i = 0; i < data.length; i++) {
          var online = data[i].online;
          var prev = oldOnlineUsers[id];
          var id = data[i].id;

          if(online) {
            onlineUsers[id] = true;
          }

          if(online && !prev || !online && prev) {
            updateAvatars(id, online);
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
