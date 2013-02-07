/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  './fileItemView',
  'hbs!./tmpl/fileHelpView',
  'hbs!./tmpl/fileAddButton',
  './../base',
  './../../../play/bootstrap-tooltip'
], function($, _, Backbone, Marionette, FileItemView, fileHelpView, fileAddButtonView, TroupeViews) {
  "use strict";

  var FileView = Marionette.CollectionView.extend({
    itemView: FileItemView,
    emptyView: Backbone.View.extend({
      template: fileHelpView
    }),

    events: {
      'click .add-file': 'addFile'
    },

    initialize: function() {
      this.initializeSorting();

      var self = this;
      this.once('render', function() {
        // no add button for compact view
        if (window._troupeCompactView !== true) {
          // setup the add file button
          var addFileButton = $(fileAddButtonView());
          self.$el.prepend(addFileButton);
          addFileButton.tooltip({
            html : true,
            placement : "right"
          });
        }
      });
    },

    addFile: function() {
      $('#fineUploader input[type=file]').click();
    }

  });

  _.extend(FileView.prototype, TroupeViews.SortableMarionetteView);

  return FileView;

});
