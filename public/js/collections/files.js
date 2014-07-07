define([
  'utils/context',
  'backbone',
  './base',
  '../utils/momentWrapper',
  'cocktail'
], function(context, Backbone, TroupeCollections, moment, cocktail) {
  "use strict";

  var FileVersionModel = TroupeCollections.Model.extend({
    parse: function(message) {
      message.createdDate = moment.utc(message.createdDate);

      // Check for the special case of messages from the current user
      if(message.unread && message.versions) {
        var latestVersion = message.versions[message.versions.length - 1];
        if(latestVersion && latestVersion.creatorUser) {
          if(latestVersion.creatorUser.id === context.getUserId()) {
            message.unread = false;
          }
        }
      }

      return message;
    }
  });

  var FileVersionCollection  = Backbone.Collection.extend({
    model: FileVersionModel
  });

  var FileModel = TroupeCollections.Model.extend({
    idAttribute: "id",

    defaults: {
    },

    initialize: function() {
      this.convertArrayToCollection('versions', FileVersionCollection);
    }
  });

  var FileCollection = TroupeCollections.LiveCollection.extend({
    model: FileModel,
    modelName: 'file',
    nestedUrl: "files",
    initialSortBy: '-date',

    sortByMethods: {
      "date": function(file) {
        var versions = file.get('versions');
        var d = versions.at(versions.length - 1).get('createdDate');
        return d ? d.valueOf() : 0;
      }
    },

    initialize: function() {
      FileCollection.__super__.initialize.apply(this, arguments);

      // note: this calls resort a bit too much, because 'versions' is a collection,
      // and a change comes through for each attribute on the new version.
      // ideally we could listen to just the add event
      var self = this;
      this.on('change:versions', function() {
          self.sort();
      });
    }
  });

  cocktail.mixin(FileCollection, TroupeCollections.ReversableCollectionBehaviour);

  return {
    FileCollection: FileCollection,
    FileModel: FileModel,
    FileVersionCollection: FileVersionCollection,
    FileVersionModel: FileVersionModel
  };
});
