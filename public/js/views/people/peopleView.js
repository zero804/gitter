// Filename: views/home/main
// TODO: Confirmation after invite sent
// TODO: Implement remove user properly
// TODO: Fix showing invites

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!views/people/people',
  'hbs!views/people/item',
  'views/confirmDialog',
  'views/people/inviteItemView',
  'collections/invites',
  'views/share/shareModalView',
  './requestTabView'
], function($, _, Backbone, TroupeViews, template, itemTemplate, ConfirmDialog, InviteItemView, inviteModels, ShareModalView, RequestTabView){
  "use strict";

  var PeopleView = Backbone.View.extend({

    initialize: function(options) {
      if(options && options.params) {
        this.initialTab = options.params.tab;
      }

      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderUsers(data);
        }
      });
    },

    events: {
      "click .remove": "removeUser",
      "click #share-button" : "showShareView"
    },

    render: function() {
      var self = this;
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);

      this.$el.find('#requests').html(new RequestTabView().render().el);

      if(this.initialTab) {
        $("#tab-people-" + this.initialTab, this.el).tab('show');
        this.onTabSelected(this.initialTab);
      } else {
        this.onTabSelected('users');
      }

      $('a[data-toggle="tab"]', this.el).on('shown', function (e) {
        self.onTabSelected($(e.target).data('tab-id'));
      });

      return this;
    },

    showShareView: function() {
      var view = new ShareModalView({ model: this.model, uri: window.troupeContext.troupe.uri });
      var modal = new TroupeViews.Modal({ view: view  });

      view.on('share.complete', function(data) {
          modal.off('share.complete');
          modal.hide();
        });

      modal.show();

      return false;
    },

    onTabSelected: function(tab) {
      switch(tab) {
        case 'invites':
          this.onInviteTabSelected();
          break;
      }
    },

    onInviteTabSelected: function() {
      if(!this.invites) {
        this.invites = new inviteModels.InviteCollection();

        this.invites.bind('add', this.onAddOneInvite, this);
        this.invites.bind('reset', this.onAddAllInvites, this);
        //this.invites.bind('all', this.render, this);
      }

      this.invites.fetch();
    },

    onAddOneInvite: function(item) {
      console.log("rendering" + item);
      var view = new InviteItemView({model: item});
      $("#tbody-invites", this.el).append(view.render().el);
    },

    onAddAllInvites: function() {
       $("#tbody-invites", this.el).empty();
      this.invites.each(this.onAddOneInvite);
    },

    renderUsers: function(users) {
      $(".frame-people", this.el).empty();
      while(users.length > 0) {
        var p1 = users.shift();

        var itemHtml = itemTemplate({
          personName: p1.displayName,
          personAvatarUrl: p1.avatarUrl,
          personRemove: p1.id != window.troupeContext.user.id
        });

        $(".frame-people", this.el).append(itemHtml);
      }
    },

    removeUser: function() {
      var c = new ConfirmDialog({
        title: "Are you sure?",
        message: "Are you sure you want to remove user...."
      });
      c.show();

      return false;
    }

  });

  return PeopleView;
});
