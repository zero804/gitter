/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'utils/context',
  'marionette',
  'views/base',
  'hbs!./tmpl/orgListItem'
], function(context, Marionette, TroupeViews, orgListItemTemplate) {
  "use strict";

  var OrgItemView = TroupeViews.Base.extend({
    tagName: 'li',
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
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: OrgItemView
  });

});
