/*jshint unused:true browser:true*/
// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./tmpl/troupeListItem'
], function($, _, Backbone, Marionette, TroupeViews, troupeListItemTemplate) {
  "use strict";

  var TroupeItemView = Backbone.Marionette.ItemView.extend({
    tagName: 'li',
    template: troupeListItemTemplate
  });

  return Backbone.Marionette.CollectionView.extend({
    itemView: TroupeItemView
  });

});
