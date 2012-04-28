// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/people/people.mustache',
  'text!templates/people/row.mustache',
  'views/confirmDialog',
  'views/people/inviteItemView',
  'collections/invites'
], function($, _, Backbone, Mustache, template, rowTemplate, ConfirmDialog, InviteItemView, InviteCollection){
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
      "click .button-remove": "removeUser"
    },

    render: function() {
      var self = this;
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);

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

    onTabSelected: function(tab) {
      switch(tab) {
        case 'invites':
          this.onInviteTabSelected();
          break;
      }
    },

    onInviteTabSelected: function() {
      if(!this.invites) {
        this.invites = new InviteCollection();

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
        var p2 = users.shift();

        var rowHtml = Mustache.render(rowTemplate, {
          person1Name: p1.displayName,
          person2Name: p2 ? p2.displayName : null,
          person2: p2,
          more: users.length > 0,
          person1AvatarUrl: p1.avatarUrl,
          person2AvatarUrl: p2 ? p2.avatarUrl : null,
          person1Remove: p1.id != window.troupeContext.user.id,
          person2Remove: p2 && p2.id != window.troupeContext.user.id
        });

        $(".frame-people", this.el).append(rowHtml);
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
