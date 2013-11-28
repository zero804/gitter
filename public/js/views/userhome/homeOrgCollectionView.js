/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'utils/context',
  'marionette',
  'views/base',
  'hbs!./tmpl/homeOrgListItem'
], function(context, Marionette, TroupeViews, orgListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'div',
    className: 'org-list-item',
    template: orgListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    },
    getRenderData: function() {
      var data = {};
      data.org = this.model.toJSON();
      data.user = context.getUser();

      return data;
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'div',
    itemView: TroupeItemView
  });

});
