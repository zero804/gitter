
define([
  'marionette',
  'hbs!./tmpl/repoListItem'
], function(Marionette, repoListItemTemplate) {
  "use strict";

  var RepoItemView = Marionette.ItemView.extend({
    tagName: 'li',
    template: repoListItemTemplate,
    modelEvents: {
      change: 'render'
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: RepoItemView
  });

});
