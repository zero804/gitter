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
      this.sort(sortField);
    };
  }

  function reverseComparatorFunction(comparatorFunction) {
    return function(left, right) {
      return -1 * comparatorFunction(left, right);
    };
  }

  function sortByComparator(sortByFunction) {
    return function(left, right) {
      var l = sortByFunction(left);
      var r = sortByFunction(right);

      if (l === void 0) return 1;
      if (r === void 0) return -1;

      return l < r ? -1 : l > r ? 1 : 0;
    };
  }

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

    events: {
      "click .link-sort-filename": makeSort('fileName'),
      "click .link-sort-mtime": makeSort('mtime'),
      "click .link-sort-filetype": makeSort('mimeType'),
      "click .link-sort-groupby": makeSort('mimeType') // TODO: do something else
    },

    sort: function(sortField) {
      var reverse;
      if(sortField == this.currentSortField) {
        reverse = true;
        this.currentSortField = "-" + sortField;
      } else {
        reverse = false;
        this.currentSortField = sortField;
      }

      var comparator = sortByComparator(function(file) {
        switch(sortField) {
          case 'mtime':
            var versions = file.get('versions');
            if(!versions || !versions.length) return null;
            var version = versions.at(versions.length - 1);
            return version.createdDate;

          case 'fileName':
            var fileName = file.get('fileName');
            return fileName ? fileName.toLowerCase() : '';

          default:
            return file.get(sortField);
        }
      });

      if(reverse) {
        comparator = reverseComparatorFunction(comparator);
      }

      this.collection.comparator = comparator;
      this.collection.sort();
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
      $("#frame-help").show();
      $(".frame-files", this.el).empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
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
