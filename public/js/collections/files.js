/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  './base',
  '../utils/momentWrapper'
], function($, _, Backbone, TroupeCollections, moment) {
  "use strict";

  var exports = {};

  exports.FileVersionModel = TroupeCollections.Model.extend({
    parse: function(message) {
      message.createdDate = moment.utc(message.createdDate);

      // Check for the special case of messages from the current user
      if(message.unread && message.versions) {
        var latestVersion = message.versions[message.versions.length - 1];
        if(latestVersion && latestVersion.creatorUser) {
          if(latestVersion.creatorUser.id === window.troupeContext.user.id) {
            message.unread = false;
          }
        }
      }

      return message;
    }
  });

  exports.FileVersionCollection  = Backbone.Collection.extend({
    model: exports.FileVersionModel
  });

  exports.FileModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      this.convertArrayToCollection('versions', exports.FileVersionCollection);
    }
  });

  exports.FileCollection = TroupeCollections.LiveCollection.extend({
    model: exports.FileModel,
    modelName: 'file',
    nestedUrl: "files"
  });

  _.extend(exports.FileCollection.prototype, TroupeCollections.ReversableCollectionBehaviour, {

    sortByMethods: {
      "date": function(file) {
        var versions = file.get('versions');
        var d = versions.at(versions.length - 1).get('createdDate');
        return d ? d.valueOf() : 0;
      }
    },

    initialize: function() {
      TroupeCollections.LiveCollection.prototype.initialize.apply(this, arguments);

      this.setSortBy('-date');

      // note: this calls resort a bit too much, because 'versions' is a collection,
      // and a change comes through for each attribute on the new version.
      // ideally we could listen to just the add event
      var self = this;
      this.on('change:versions', function() {
          self.sort();
      });
    }
  });

  return exports;
});
