define([
  'jquery',
  'utils/context',
  'views/base',
  'hbs!./tmpl/personDetailView',
  'log!person-detail-view'
], function($, context, TroupeViews, template, log) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,
    buttonMenu : false,
    events: {
      "click #person-remove-button": "onRemoveClicked"
    },

    initialize: function() {
      this.isSelf = (context.getUserId() === this.model.id)  ? true : false;
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      d.isSelf = this.isSelf;
      d.troupe = context.getTroupe();
      // var latestVersion = this.model.get('versions').length - 1;
      // d.fileIcon = '/api/v1/troupes/' + context.getTroupeId() + '/thumbnails/' + d.fileName + "?version=" + latestVersion;
      // d.previewUrl = '#file/preview/' + d.id;
      // d.versionsUrl = '#file/versions/' + d.id;
      return d;
    },

    onRemoveClicked: function() {
      var modal = new TroupeViews.ConfirmationModal({
        title: "Are you sure?",
        body: "This will remove " + this.model.get('displayName') + " from the Troupe?",
        menuItems: [
          { action: "yes", text: "Yes", className: "trpBtnRed" },
          { action: "no", text: "No", className: "trpBtnLightGrey"}
        ]
      });

      modal.on('menuItemClicked', function(action) {
        if (action === "yes") {
          $.ajax({
            url: "/api/v1/rooms/" + context.getTroupeId() + "/users/" + this.model.get('id'),
            data: "",
            type: "DELETE",
            success: function() {
              if (this.isSelf)
                window.location = context.env('homeUrl');
              else
                window.location.href = "#!";
            }
          });
        }
        modal.off('menuItemClicked');
        modal.hide();
      }, this);

      modal.show();

      return false;
    }

  });

  View.Modal = TroupeViews.Modal.wrapView(View);

  return View;
});
