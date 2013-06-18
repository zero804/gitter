define([
  'views/base',
  'hbs!./tmpl/inviteModal'
], function(TroupeViews, inviteModalTemplate) {
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

    accept: function() {
      var self = this;
      var userId = window.troupeContext.user.id;
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
      var self = this;
      var userId = window.troupeContext.user.id;
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
        inviteId: options.inviteId,
      });

      TroupeViews.Modal.prototype.initialize.call(this, options);

    }
  });
});