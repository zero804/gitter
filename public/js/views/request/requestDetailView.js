/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/requestDetailView',
  'hbs!./tmpl/rejectConfirmation',
  'views/unread-item-view-mixin',
  'log!request-detail-view',
  'cocktail'
], function(TroupeViews, template, rejectConfirmationTemplate, UnreadItemViewMixin, log, cocktail){
  "use strict";

  var View = TroupeViews.Base.extend({
    unreadItemType: 'request',
    template: template,
    buttonMenu : false,
    events: {
      "click #request-accept-button": "onAcceptClicked",
      "click #request-reject-button": "onRejectClicked"

    },

    initialize: function() {
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      return this.model.toJSON();
    },

    onAcceptClicked: function() {
      return this.onAccept.apply(this, arguments);
    },

    onRejectClicked: function() {
      var that = this;
      var modal = new TroupeViews.ConfirmationModal({
        title: "Reject Request?",
        body: rejectConfirmationTemplate(this.model.toJSON()),
        menuItems: [
          { action: "yes", text: "Reject", additionalClasses: "" },
          { action: "no", text: "Cancel"}
        ]
      });

      modal.on('menuItemClicked', function(id) {
        if (id === "yes")
          that.onReject();

        modal.off('menuItemClicked');
        modal.hide();
      });

      modal.show();

      return false;
    },

    onReject: function() {
      this.model.destroy({
        success: function() {
          window.location.href = "#!";
        },
        error: function() {
          log("Error rejecting request.");
        }
      });
    },

    onAccept: function() {
      this.model.save({ success: function() {
          window.location.href='#';
        }
      });
    }
  });
  cocktail.mixin(View, UnreadItemViewMixin);

  View.Modal = TroupeViews.Modal.wrapView(View);

  return View;
});
