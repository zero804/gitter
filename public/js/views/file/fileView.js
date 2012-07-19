// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileView',
  './fileItemView',
  'fileUploader',
  'collections/files'
], function($, _, Backbone, TroupeViews, template, FileItemView, fileUploaderStub, fileModels) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,
    initialize: function(options) {
      var self = this;
      this.router = options.router;
      this.collection = new fileModels.FileCollection();

      this.collection.listen();
      this.collection.fetch();

      this.addCleanup(function() {
        self.collection.unlisten();
      });
    },

    getRenderData: function() {
      return {};
    },

    afterRender: function() {
      this.itemView = new TroupeViews.Collection({
        itemView: FileItemView,
        collection: this.collection,
        el: this.$el.find(".frame-files")});
      this.createUploader(this.$el.find(".fileuploader")[0]);
    },

    createUploader: function(element) {
      var uploader = new qq.FileUploader({
        element: element,
        action: '/troupes/' + window.troupeContext.troupe.id + '/downloads/',
        debug: true,
        onComplete: function() {
        }
      });
    }

  });

});
