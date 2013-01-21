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

    initialize: function() {
      this.initializeSorting();
    }

  });

  _.extend(FileView.prototype, TroupeViews.SortableMarionetteView);

  return FileView;

});
