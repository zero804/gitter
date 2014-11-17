'use strict';
var context = require('utils/context');
var itemCollections = require('collections/instances/integrated-items');

module.exports = (function() {


  function showModal() {
    window.location.hash = 'welcome';
  }

  function getUserCount(cb) {
    var users = itemCollections.users;
    if(users.length) {
      cb(users.length);
    } else {
      users.once('sync', function() {
        cb(users.length);
      });
    }
  }

  function getMessageCount(cb) {
    var chats = itemCollections.chats;
    if(chats.length) {
      cb(chats.length);
    } else {
      chats.once('sync', function() {
        cb(chats.length);
      });
    }
  }

  return function() {
    var userCountReceived = false;
    var messageCountReceived = false;
    var userCount;
    var messageCount;

    function isUserLonely() {
      return userCount === 1 && messageCount === 0;
    }

    getUserCount(function(count) {
      userCountReceived = true;
      userCount = count;

      if(userCountReceived && messageCountReceived && isUserLonely()) {
        showModal();
      }
    });

    getMessageCount(function(count) {
      messageCountReceived = true;
      messageCount = count;

      if(userCountReceived && messageCountReceived && isUserLonely()) {
        showModal();
      }
    });

  };


})();

