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
  });
  _.extend(InvitesItemView.prototype, UnreadItemViewMixin);

  return TroupeViews.Base.extend({
    template: invitesViewTemplate,

    initialize: function(/*options*/) {
      this.collectionView = new Marionette.CollectionView({
        collection: this.collection,
        itemView: InvitesItemView
      });

      var self = this;
      function updateVisibility() {
        self.setVisibility(true);
      }

      this.setVisibility(false);
      this.listenTo(this.collection, 'add', updateVisibility);
      this.listenTo(this.collection, 'remove', updateVisibility);
      this.listenTo(this.collection, 'reset', updateVisibility);
    },

    setVisibility: function(animate) {
      if (this.collection.length > 0) {
        $('#invite-header').show();
        return (animate) ? this.$el.parent().slideDown() : this.$el.parent().show();
      }
      else {
        $('#invite-header').hide();
        return (animate) ? this.$el.parent().slideUp() : this.$el.parent().hide();
      }
    },

    afterRender: function() {
      this.$el.find('.frame-invites').append(this.collectionView.render().el);
    }

  });

});