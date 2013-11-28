/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'marionette',
  'views/base',
  'hbs!./tmpl/repoListItem'
], function(Marionette, TroupeViews, repoListItemTemplate) {
  "use strict";

  var RepoItemView = TroupeViews.Base.extend({
    tagName: 'li',
    template: repoListItemTemplate,
    initialize: function() {
      this.setRerenderOnChange(true);
    },
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: RepoItemView
  });

});
