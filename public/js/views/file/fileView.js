/*jshint unused:true browser:true*/
define([
  'underscore',
  'marionette',
  './fileItemView',
  './../base'
], function(_, Marionette, FileItemView, TroupeViews) {
  "use strict";

  var FileView = Marionette.CollectionView.extend({
    itemView: FileItemView,
    emptyView: Backbone.View.extend({
      render: function() {
        // insert help text if there are no files
        this.$el.append('<p class="trpBodyMedium">There are no files, you can drag and drop files here or click the Add button above</p>');
      }
    }),

    events: {
      'click .add-file': 'addFile'
    },

    initialize: function() {
      this.initializeSorting();

      var self = this;
      this.once('render', function() {
        // setup the add file button
        var addFileButton = $('<div class="trpFileSmallThumbnail trpSmallButton" title="Add a File"><a class="add-file" href="#"><img src="/images/2/icon-square-add.png" width="31" height="31"></a></div>');
        self.$el.prepend(addFileButton);
        addFileButton.tooltip({
          html : true,
          placement : "right"
        });
      });
    },

    addFile: function() {
      $('#fineUploader input[type=file]').click();
    }

  });

  _.extend(FileView.prototype, TroupeViews.SortableMarionetteView);

  return FileView;

});
