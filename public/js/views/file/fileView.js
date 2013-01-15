// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./fileView',
  './fileItemView'
], function($, _, Backbone, Marionette, TroupeViews, template, FileItemView) {
  /*jslint browser: true*/
  /*global require */
  "use strict";

  return Backbone.Marionette.CollectionView.extend({
    itemView: FileItemView
  });

});
