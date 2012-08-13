// Filename: views/home/main
// TODO: Confirmation after invite sent
// TODO: Implement remove user properly
// TODO: Fix showing invites

console.log("Start of PeopleView");

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./people',
  'hbs!./item',
  './requestTabView',
  './inviteTabView'
], function($, _, Backbone, TroupeViews, template, itemTemplate, RequestTabView, InviteTabView) {

  console.log("Just about to enter backbone code");

  var PeopleView = Backbone.View.extend({

    initialize: function(options) {
      console.log("Initialize PeopleView");
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
          console.log("Succesfully pulled users");
          self.renderUsers(data);
        }
      });
    },

    events: {
      "click .remove": "removeUser",
      "click #share-button" : "showShareView"
    },

    render: function() {
      console.log("Entering Render");
      var self = this;
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);

      this.$el.find('#requests').html(new RequestTabView().render().el);
      this.$el.find('#invites').html(new InviteTabView().render().el);

      if(this.initialTab) {
        $("#tab-people-" + this.initialTab, this.el).tab('show');
        this.onTabSelected(this.initialTab);
      } else {

      }

      $('a[data-toggle="tab"]', this.el).on('shown', function (e) {

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

    renderUsers: function(users) {
      console.log("Entering renderUsers");
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
