// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./userItemView'
], function($, _, TroupeViews, template) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      this.displayMode = options.displayMode;
    },

    events: {
      "click .accept": "onAcceptClicked",
      "click .reject": "onRejectClicked",
      "click .remove": "onRemoveClicked"
    },

    getRenderData: function() {
      return {
        user: this.model.toJSON(),
        displayEmail: this.displayMode == 'request' || this.displayMode == 'invite',
        displayModeRequest: this.displayMode == 'request',
        displayModeInvite: this.displayMode == 'invite',
        displayModeUser: this.displayMode == 'user'
      };
    },

    afterRender: function(data) {
    },

    onAcceptClicked: function() {
      var that = this;
      var thisPerson = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/requests/" + this.model.get('id'),
        dataType: "json",
        data: "",
        type: "PUT",
        success: function(data) {
          // NOTHING HERE SEEMS TO GET CALLED?!
          alert("Great Success!");
          thisPerson.$el.remove();
          that.trigger('accept.complete', { userId: this.model.get('id') } );
        }
      });
      return false;
    },

    onRejectClicked: function() {
      var that = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/requests/" + this.model.get('id'),
        dataType: "json",
        data: "",
        type: "DELETE",
        success: function(data) {
          that.trigger('reject.complete', { userId: this.model.get('id') } );
        }
      });
      return false;
    },

    onRemoveClicked: function() {
      var that = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users/" + this.model.get('id'),
        dataType: "json",
        data: "",
        type: "DELETE",
        success: function(data) {
          that.trigger('remove.complete', { userId: this.model.get('id') } );
        }
      });
      return false;
    }
  });

});