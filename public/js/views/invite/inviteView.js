/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'marionette',
  'hbs!./tmpl/inviteView',
  'hbs!./tmpl/inviteItemView',
  'views/unread-item-view-mixin',
  'cocktail'
], function(TroupeViews, Marionette, invitesViewTemplate, invitesItemViewTemplate, UnreadItemViewMixin, cocktail) {
  "use strict";

  var InvitesItemView = TroupeViews.Base.extend({
    tagName: 'span',
    unreadItemType: 'invite',
    template: invitesItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  });
  cocktail.mixin(InvitesItemView, UnreadItemViewMixin);

  return TroupeViews.Base.extend({
    template: invitesViewTemplate,

    initialize: function(/*options*/) {
      this.collectionView = new Marionette.CollectionView({
        collection: this.collection,
        itemView: InvitesItemView
      });
    },

    afterRender: function() {
      this.$el.find('.frame-invites').append(this.collectionView.render().el);
    }

  });

});