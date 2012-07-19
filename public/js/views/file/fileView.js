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
], function($, _, Backbone, TroupeViews, template, FileItemView, fileUploaderStub, FileModels) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      this.router = options.router;
      this.collection = new FileModels.FileCollection();

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset', 'onCollectionRemove', 'onFileEvent');

      this.collection.bind('add', this.onCollectionAdd);
      this.collection.bind('remove', this.onCollectionRemove);
      this.collection.bind('reset', this.onCollectionReset);

      this.collection.listen();

      this.collection.fetch();

      //$(document).on('file', this.onFileEvent);
    },

    getRenderData: function() {
      return {};
    },

    afterRender: function() {
      this.filesFrame = this.$el.find(".frame-files");
      this.createUploader(this.$el.find(".fileuploader")[0]);
    },

    beforeClose: function() {
      this.collection.unlisten();
      //$(document).unbind('file', this.onFileEvent);
    },

    onFileEvent: function(event, data) {
      this.collection.fetch();
    },

    onCollectionReset: function() {
      this.filesFrame.empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
      this.filesFrame.append(new FileItemView({ model: item }).render().el);
    },

    onCollectionRemove: function(item) {
      this.filesFrame.find('.model-id-' + item.get('id')).each(function(index, item) {
        if(item._view) item._view.remove();
      });
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
