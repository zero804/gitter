/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  './fileItemView',
  'hbs!./tmpl/fileHelpView',
  'hbs!./tmpl/fileAddButton',
  '../base',
  'cocktail',
  'bootstrap_tooltip'
], function($, Marionette, FileItemView, fileHelpTemplate, fileAddButtonTemple, TroupeViews, cocktail) {
  "use strict";

  var FileView = Marionette.CollectionView.extend({
    itemView: FileItemView,
    emptyView: TroupeViews.Base.extend({
      template: fileHelpTemplate
    }),

     initialize: function() {
      var self = this;

      this.once('render', function() {
        // no add button for compact view
        if (window._troupeCompactView !== true) {
          // setup the add file button
          var addFileButton = $.parseHTML(fileAddButtonTemple());
          self.$el.prepend(addFileButton);
          $(addFileButton).tooltip({
            html : true,
            container: "body"
          });
        }
      });
    }

  });
  cocktail.mixin(FileView, TroupeViews.SortableMarionetteView);

  return FileView;

});
