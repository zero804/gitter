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

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset');

      this.collection.bind('add', this.onCollectionAdd);
      this.collection.bind('reset', this.onCollectionReset);

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

    onCollectionReset: function() {
      // Probably not the best way to do this, want to show/hide frame-help if there are no files
      console.log("Reset collection");
      $("#frame-help").show();
      $(".frame-files", this.el).empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
      console.log("Collection add");
      $("#frame-help").hide();
      $(".frame-files", this.el).append(new FileItemView({ model: item }).render().el);
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
