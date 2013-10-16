/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'hbs!./tmpl/inviteDetailView',
  'hbs!./tmpl/deleteConfirmation',
  'views/unread-item-view-mixin',
  'log!request-detail-view',
  'cocktail',
  'utils/context'
], function($, TroupeViews, template, deleteConfirmationTemplate, UnreadItemViewMixin, log, cocktail, context){
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
      var email = this.model.get('email');
      var user = this.model.get('user');

      var invite = email ? { email: email } : { userId: user.id };

      // check whether the invite is to a troupe or to the user.
      var endpoint = this.model.isForTroupe() ? '/troupes/' + context.getTroupeId() + '/invites' : '/api/v1/inviteconnections';

      $.ajax({
        url: endpoint,
        contentType: "application/json",
        dataType: "json",
        context: this,
        data: JSON.stringify(invite),
        type: "POST"
      });
    },

    onDeleteClicked: function() {
      var that = this;
      var modal = new TroupeViews.ConfirmationModal({
        title: "Delete Invite?",
        body: deleteConfirmationTemplate(this.model.toJSON()),
        menuItems: [
          { action: "yes", text: "Delete", class: "trpBtnRed" },
          { action: "no", text: "Cancel", class: "trpBtnLightGrey"}
        ]
      });

      modal.on('menuItemClicked', function(id) {
        if (id === "yes")
          that.onDelete();

        modal.off('menuItemClicked');
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
