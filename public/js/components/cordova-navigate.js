define([
  'components/apiClient'
], function(apiClient) {
  "use strict";

  var cordova = window.cordova;
  var noop = function() {};

  function getUriFromUrl(url) {
    var parser = document.createElement('a');
    parser.href = url;

    return parser.pathname.substring(1);
  }

  function getIdForUri(uri, cb) {
    apiClient.post('/v1/rooms', { uri: uri })
      .then(function(room) {
        cb(null, room.id);
      })
      .fail(function() {
        return cb(new Error('API call failed'));
      });
  }

  var updateNativeContext = function(url, context, troupeId, altContext, title) {
    cordova.exec(
      noop,
      noop,
      "TroupeContext",
      "updateContext",
      [ url, context, troupeId, altContext, title ]
    );
  };

  var updateNativeContextWithTroupe = function(troupe) {
    var name = troupe.get('name');
    var id = troupe.get('id');

    if(id && name) {
      var url = window.location.origin + '/mobile/chat#' + id;
      var context = 'troupe';
      var altContext = 'chat';
      updateNativeContext(url, context, id, altContext, name);
    }
  };

  return {
    navigate: function(url) {
      if(!cordova) return;

      var uri = getUriFromUrl(url);

      getIdForUri(uri, function(err, id) {
        if(err || !id) return;

        updateNativeContext(id, uri);
        window.location.href = '/mobile/chat#' + id;
      });
    },
    syncNativeWithWebContext: function(troupe) {
      if(!cordova) return;

      troupe.on('change', function() {
        updateNativeContextWithTroupe(troupe);
      });

      updateNativeContextWithTroupe(troupe);
    },
    setNativeToUserhome: function() {
      if(!cordova) return;

      updateNativeContext(window.location.href, 'home', null, null, 'Home');
    }
  };

});
