"use strict";
var log = require('../utils/log');
var context = require('../utils/context');

module.exports = (function() {

  var PLUGIN = "ChatSnapshot";

  function cdvError(callback) {
    return function(error) {
      return callback && callback(error);
    };
  }

  function cdvSuccess(callback) {
    return function(result) {
      return callback && callback(null, result);
    };
  }

  var slice = Function.prototype.call.bind(Array.prototype.slice);

  function cdvCall(name) {
    return function() {
      var callback = arguments[arguments.length - 1];
      window.cordova.exec(cdvSuccess(callback), cdvError(callback), PLUGIN, name, slice(arguments, 0, -1));
    };
  }

  var getChatsForTroupe = cdvCall('getChatsForTroupe');
  var updateChat = cdvCall('updateChat');
  var removeChat = cdvCall('removeChat');

  function ChatCacheSync(collection) {
    var troupeId = context.getTroupeId();

    log.info('Loading collection from native cache');

    getChatsForTroupe(troupeId, function(err, result) {
      if(err || !result) return;
      log.info('Cache contains ' + result.length + ' items');

      collection.reset(result, { parse: true });

      collection.forEach(function(model) {
        model.set('presnapshot', true);
      });
    });

    this.onAddChange = function(model) {
      if(model.id) {
        updateChat(troupeId, model.id, JSON.stringify(model.toJSON()), null);
      }
    };

    this.onSync = function() {
      collection.forEach(function(model) {
        updateChat(troupeId, model.id, JSON.stringify(model.toJSON()), null);
      });
    };

    this.onRemove = function(model) {
      if(model.id) {
        removeChat(troupeId, model.id, null);
      }
    };

    collection.on('add change', this.onAddChange);
    collection.on('sync', this.onSync);
    collection.on('remove', this.onRemove);
  }

  return {
    install: function(collection) {
      var cordova = window.cordova;
      if(cordova) {
        document.addEventListener("deviceready", function() {
          new ChatCacheSync(collection);
        });
      }
    }
  };


})();

