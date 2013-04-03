
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/requestDetailView',
  'hbs!./tmpl/rejectConfirmation'
], function($, _, Backbone, TroupeViews, template, rejectConfirmationTemplate){
  return TroupeViews.Base.extend({
    unreadItemType: 'request',
    template: template,
    buttonMenu : false,
    events: {
      "click #request-accept-button": "onAcceptClicked",
      "click #request-reject-button": "onRejectClicked"

    },

    initialize: function(options) {
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
        success: function(data) {
          window.location.href = "#!";
        },
        error: function(model, resp, options) {
          if (typeof console != "undefined") console.log("Error rejecting request.");
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
});
