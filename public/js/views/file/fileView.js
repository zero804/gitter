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

  function makeSort(sortField) {
    return function(e) {
      e.preventDefault();
      this.collectionView.sortBy(sortField);
    };
  }

  return TroupeViews.Base.extend({
    template: template,
    initialize: function(options) {
      _.bindAll(this, 'showSortMenu', 'hideSortMenu');
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

    events: {
      "click .link-sort-filename": makeSort('fileName'),
      "click .link-sort-mtime": makeSort('mtime'),
      "click .link-sort-filetype": makeSort('mimeType'),
      "click .link-sort-groupby": makeSort('mimeType'), 
      "click .file-sorter": "showSortMenu"
    },

    afterRender: function() {
      this.collectionView = new TroupeViews.Collection({
        itemView: FileItemView,
        collection: this.collection,
        el: this.$el.find(".frame-files"),
        noItemsElement: this.$el.find("#frame-help"),
        sortMethods: {
          "mtime": function(file) {
            var versions = file.get('versions');
            if(!versions || !versions.length) return null;
            var version = versions.at(versions.length - 1);
            return version.createdDate;
          },
          "fileName": function(file) {
            var fileName = file.get('fileName');
            return fileName ? fileName.toLowerCase() : '';
          },
          "mimeType": function(file) {
            return file.get("mimeType");
          }
        }
      });
      this.createUploader(this.$el.find(".fileuploader")[0]);
    },

    createUploader: function(element) {
      var uploader = new qq.FileUploader({
        element: element,
        action: '/troupes/' + window.troupeContext.troupe.id + '/downloads/',
        debug: true,
        extraDropzones: [qq.getByClass(document, 'trpContentContainer')[0]],
        onComplete: function() {
        }
      });
    },

    showSortMenu: function(e) {
      $('body, html').on('click', this.hideSortMenu);
      this.$el.find(".trpSortMenu").fadeIn('fast');
      return false;
    },

    hideSortMenu: function(e) {
      var self = this;
      $('body, html').off('click', this.hideSortMenu);
      this.$el.find('.trpSortMenu').fadeOut('fast');
    }


  });

});
