/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'utils/context',
  'hbs!./tmpl/inviteModal'
], function(TroupeViews, context, inviteModalTemplate) {
  "use strict";

  var InviteView = TroupeViews.ConfirmationView.extend({
    template: inviteModalTemplate,
    events: {
      'click #accept-invite': 'accept',
      'click #reject-invite': 'reject'
    },

    initialize: function(options) {
      this.inviteId = options.inviteId;
    },

    getRenderData: function() {
      var isOneToOne;
      var firstName;
      console.log("HomeUser" + context.getHomeUser());
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
      var userId = context.getUserId();
      var inviteId = this.inviteId;

      $.ajax({
        async: false,
        method: "PUT",
        url: "/user/" + userId + "/invites/" + inviteId,
        success: function() {
          window.location.reload();
        },
        error: function() {
          alert("There was an error accepting this invite, please try again later or contact support");
        }
      });
    },

    reject: function() {
      var userId = context.getUserId();
      var inviteId = this.inviteId;

      $.ajax({
        async: false,
        method: "DELETE",
        url: "/user/" + userId + "/invites/" + inviteId,
        success: function() {
          window.history.back();
        },
        error: function() {
          alert("There was an error rejecting this invite, please try again later or contact support");
        }
      });

    }
  });

  return TroupeViews.Modal.extend({
    initialize: function(options) {

      options.view = new InviteView({
        inviteId: options.inviteId
      });

      TroupeViews.Modal.prototype.initialize.call(this, options);

    }

  });
});