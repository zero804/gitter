/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'utils/context',
  'log!invite-modal-view',
  'hbs!./tmpl/inviteModal'
], function($, TroupeViews, context, log, inviteModalTemplate) {
  "use strict";

  var InviteView = TroupeViews.ConfirmationView.extend({
    template: inviteModalTemplate,
    events: {
      'click #accept-invite': 'accept',
      'click #reject-invite': 'reject'
    },

    initialize: function(options) {
      this.inviteId = options.inviteId;
      if(this.model) {
        this.setRerenderOnChange(true);
      }
    },

    getRenderData: function() {
      var firstName;

      if(this.model) {
        var user = this.model.get('fromUser');
        firstName = user && user.displayName || '';
        firstName = firstName.split(/\s+/).shift();

        return {
          isOneToOne: this.model.get('oneToOneInvite'),
          homeUser: user,
          firstName: firstName
        };

      }

      var isOneToOne;

      if (context.getHomeUser()) {
        isOneToOne = true;
        firstName = context.getHomeUser().displayName.split(" ").shift();
      }
      return {
        isOneToOne: isOneToOne,
        homeUser: context.getHomeUser(),
        firstName: firstName
      };
    },

    accept: function() {
      var self = this;
      var userId = context.getUserId();
      var inviteId = this.model ? this.model.id : this.inviteId;

      $.ajax({
        async: false,
        method: "PUT",
        context: this,
        url: "/user/" + userId + "/invites/" + inviteId,
        success: function(data) {
          self.trigger('invite:accept', data);
        },
        error: function() {
          log("There was an error accepting this invite, please try again later or contact support");
        }
      });
    },

    reject: function() {
      var self = this;
      var userId = context.getUserId();
      var inviteId = this.model ? this.model.id : this.inviteId;

      $.ajax({
        async: false,
        context: this,
        method: "DELETE",
        url: "/user/" + userId + "/invites/" + inviteId,
        success: function() {
          self.trigger('invite:reject');
        },
        error: function() {
          log("There was an error rejecting this invite, please try again later or contact support");
        }
      });

    }
  });

  return TroupeViews.Modal.extend({
    initialize: function(options) {

      options.view = new InviteView(options);

      // Proxy all events
      this.listenTo(options.view, 'all', this.trigger);

      TroupeViews.Modal.prototype.initialize.call(this, options);

    }

  });
});