define([
  'jquery',
  'underscore',
  'backbone',
  './base',
  'models/file'
], function($, _, Backbone, TroupeCollections, FileModel) {
  return TroupeCollections.LiveCollection.extend({
    model: FileModel,
    modelName: 'file',
    nestedUrl: "files"
  });
});
