/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./tmpl/troupeListItem'
], function($, _, Backbone, Marionette, TroupeViews, troupeListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'li',
    template: troupeListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    }
  });

  return Backbone.Marionette.CollectionView.extend({
    itemView: TroupeItemView
  });

});
