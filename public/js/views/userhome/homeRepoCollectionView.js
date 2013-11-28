/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'utils/context',
  'marionette',
  'views/base',
  'hbs!./tmpl/homeRepoListItem'
], function(context, Marionette, TroupeViews, repoListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'div',
    className: 'org-list-item',
    template: repoListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    },
    getRenderData: function() {
      var data = {};
      data.repo = this.model.toJSON();
      data.user = context.getUser();

      return data;
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'div',
    itemView: TroupeItemView
  });

});
