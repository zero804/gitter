/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'utils/context',
  'marionette',
  'views/base',
  'hbs!./tmpl/troupeListItem'
], function(context, Marionette, TroupeViews, troupeListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'li',
    template: troupeListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    },
    getRenderData: function() {
      var data = {};
      data.room = this.model.toJSON();
      data.user = context.getUser();

      return data;
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: TroupeItemView
  });

});
