/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'marionette',
  'views/base',
  'hbs!./tmpl/homeRepoListItem'
], function(Marionette, TroupeViews, repoListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'div',
    className: 'org-list-item',
    template: repoListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'div',
    itemView: TroupeItemView
  });

});
