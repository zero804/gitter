define([
  'jquery',
  'underscore',
  'backbone',
  'models/file'
], function($, _, Backbone, FileModel) {
  var FileCollection = Backbone.Collection.extend({
    model: FileModel,
    url: "/troupes/" + window.troupeContext.troupe.id + "/files",
    initialize: function() {
    }

  });

  return FileCollection;
});
