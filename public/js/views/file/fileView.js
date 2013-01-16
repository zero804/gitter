/*jshint unused:true browser:true*/
// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./fileView',
  './fileItemView',
  'collections/files'
], function($, _, Backbone, Marionette, TroupeViews, template, FileItemView, fileModels) {
  /*jslint browser: true*/
  /*global require */
  "use strict";

  return Backbone.Marionette.CollectionView.extend({
    itemView: FileItemView
  });

});
