/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require(['utils/context'], function(context) {
  "use strict";

  // The room id is taken from the hash instead of the url.
  // This means that the we can use the same url for all rooms, and so
  // cache one page in the user's browser.
  var roomId = window.location.hash.split('#')[1] || window.localStorage.lastTroupeId;

  if(!roomId) {
    window.location.href = '/mobile/home';
  }

  window.localStorage.lastTroupeId = roomId;
  context.setTroupeId(roomId);

  require(['mobile-native-chat'], function() {});

});
