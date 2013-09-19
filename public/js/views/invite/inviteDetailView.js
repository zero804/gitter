/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'views/shareSearch/shareSearchView',
  'hbs!./tmpl/inviteDetailView',
  'hbs!./tmpl/deleteConfirmation',
  'views/unread-item-view-mixin',
  'log!request-detail-view',
  'cocktail'
], function(TroupeViews, shareSearchView, template, deleteConfirmationTemplate, UnreadItemViewMixin, log, cocktail){
  "use strict";

  var View = TroupeViews.Base.extend({
    unreadItemType: 'invite',
    template: template,
    buttonMenu : false,
    events: {
      "click #invite-delete-button": "onDeleteClicked",
      "click #invite-resend-button": "onResendClicked"
    },

    initialize: function() {
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      return this.model.toJSON();
    },

    /*
    onDeleteClicked: function() {
      return this.onDelete.apply(this, arguments);
    },
    */

    onResendClicked: function() {
      // open up share dialog populated with the email address.
      var email = this.model.get('email');
      var user = this.model.get('user');
      var invites = [];

      if (email) {
        invites.push({ email: email });
      } else if (user && user.id) {
        invites.push(user);
      } else {
        log("Error resending invite");
      }


      var viewOptions = { invites: invites };

      // check whether the invite is to a troupe or to the user.
      if (!this.model.isForTroupe()) {
        viewOptions.overrideContext = true;
        viewOptions.inviteToConnect = true;
      }

      var m = new shareSearchView.Modal(viewOptions);
      m.show();
      m.view.sendInvites();
    },

    onDeleteClicked: function() {
      var that = this;
      var modal = new TroupeViews.ConfirmationModal({
        title: "Delete Invite?",
        body: deleteConfirmationTemplate(this.model.toJSON()),
        buttons: [
          { id: "yes", text: "Delete", additionalClasses: "" },
          { id: "no", text: "Cancel"}
        ]
      });

      modal.on('button.click', function(id) {
        if (id === "yes")
          that.onDelete();

        modal.off('button.click');
        modal.hide();
      });

      modal.show();

      return false;
    },

    onDelete: function() {
      this.model.destroy({
        success: function() {
          window.location.href = "#!";
        },
        error: function() {
          log("Error rejecting request.");
        }
      });
    }

    /*, onAccept: function() {
      this.model.save({ success: function() {
          window.location.href='#';
        }
      });
    }*/
  });
  cocktail.mixin(View, UnreadItemViewMixin);

  View.Modal = TroupeViews.Modal.wrapView(View);

  return View;
});
