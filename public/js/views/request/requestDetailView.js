/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/requestDetailView',
  'hbs!./tmpl/rejectConfirmation',
  'views/unread-item-view-mixin',
  'log!request-detail-view'
], function(TroupeViews, template, rejectConfirmationTemplate, UnreadItemViewMixin, log){
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
        buttons: [
          { id: "yes", text: "Reject", additionalClasses: "" },
          { id: "no", text: "Cancel"}
        ]
      });

      modal.on('button.click', function(id) {
        if (id === "yes")
          that.onReject();

        modal.off('button.click');
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


  }).mixin([UnreadItemViewMixin]);

  return View;
});
