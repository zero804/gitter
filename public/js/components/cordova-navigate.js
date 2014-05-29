/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore'
], function($, _) {
  "use strict";

  var cordova = window.cordova;
  var noop = function() {};

  if(!cordova) return noop;

  function getIdForUri(uri, cb) {
    $.post('/api/v1/rooms', { uri: uri }, function() {
      $.get('/api/v1/rooms', function(rooms) {
        var room = _.findWhere(rooms, { uri: uri });
        cb(null, room.id);
      });
    });
  }

  function updateCordovaContext(uri, id) {
    var url = window.location.href;
    var context = 'troupe';
    var contextId = id;
    var altContext = 'chat';
    var title = uri;
    cordova.exec(
      noop,
      noop,
      "TroupeContext",
      "updateContext",
      [ url, context, contextId, altContext, title ]
    );
  }

  return function(url) {
    var uri = url.substring(1);

    getIdForUri(uri, function(err, id) {
      if(err) return;

      updateCordovaContext(uri, id);
      window.location.href = '/mobile/chat#' + id;
    });
  };

});
