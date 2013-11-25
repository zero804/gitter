/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'marionette',
  'views/base',
  'hbs!./tmpl/homeOrgListItem'
], function(Marionette, TroupeViews, orgListItemTemplate) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'div',
    className: 'org-list-item',
    template: orgListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'div',
    itemView: TroupeItemView
  });

});
