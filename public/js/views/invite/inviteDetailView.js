/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/inviteDetailView',
  'log!request-detail-view'
], function($, _, Backbone, TroupeViews, template, log){
  "use strict";

  return TroupeViews.Base.extend({
    unreadItemType: 'invite',
    template: template,
    buttonMenu : false,
    events: {
      "click #invite-delete-button": "onDeleteClicked"
    },

    initialize: function(options) {
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      return this.model.toJSON();
    },

    onDeleteClicked: function() {
      return this.onDelete.apply(this, arguments);
    },

    /*onDeleteClicked: function() {
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
    },*/

    onDelete: function() {
      this.model.destroy({
        success: function(data) {
          window.location.href = "#!";
        },
        error: function(model, resp, options) {
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
});
