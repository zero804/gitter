/*jshint unused:true browser:true*/
define([
  'marionette',
  './fileItemView'
], function(Marionette, FileItemView) {
  "use strict";

  return Marionette.CollectionView.extend({
    itemView: FileItemView
  });

});
