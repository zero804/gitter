/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'marionette',
  'hbs!./tmpl/inviteView',
  'hbs!./tmpl/inviteItemView',
  'views/unread-item-view-mixin'
], function(TroupeViews, Marionette, invitesViewTemplate, invitesItemViewTemplate, UnreadItemViewMixin) {
  "use strict";

  var InvitesItemView = TroupeViews.Base.extend({
    tagName: 'span',
    unreadItemType: 'invite',
    template: invitesItemViewTemplate,

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    }
  }).mixin(UnreadItemViewMixin);

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