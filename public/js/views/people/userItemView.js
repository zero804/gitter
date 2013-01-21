/*jshint unused:true browser:true*/
// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./userItemView',
  './confirmRemoveModalView'
], function($, _, TroupeViews, template, ConfirmRemoveModalView) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      this.displayMode = options.displayMode;
      this.unreadItemType = this.displayMode;
    },

    events: {
      "click .accept": "onAcceptClicked",
      "click .reject": "onRejectClicked",
      "click .remove": "onRemoveClicked"
    },

    getRenderData: function() {
      var model = this.model.toJSON();

      var m = {
        id: model.id,
        displayMode: this.displayMode,
        user: this.displayMode == 'request' ? model.user : model,
        displayEmail: this.displayMode == 'request' || this.displayMode == 'invite',
        displayModeRequest: this.displayMode == 'request',
        displayModeInvite: this.displayMode == 'invite',
        displayModeUser: this.displayMode == 'user',
        unread: model.unread
      };
      return m;
    },

    afterRender: function(data) {
    },

    onAcceptClicked: function() {
      this.model.save();
      /*
      var that = this;
      var thisPerson = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/requests/" + this.model.get('id'),
        data: "",
        type: "PUT",
        success: function(data) {
          thisPerson.$el.toggle();
          that.trigger('accept.complete', { userId: this.model.get('id') } );
        }
      });
      */
      return false;
    },

    onRejectClicked: function() {
      var that = this;

      this.model.destroy({
        success: function(data) {
          console.log("SUCCESS!");
          that.trigger('reject.complete', { userId: this.model.get('id') } );
        }
      });

      return false;
    },

    onRemoveClicked: function() {
      var that = this;
      var thisPerson = this;
      var view = new ConfirmRemoveModalView({ model: this.model });
      var modal = new TroupeViews.Modal({ view: view  });

      view.on('confirm.yes', function(data) {
          modal.off('confirm.yes');
          modal.hide();
           $.ajax({
              url: "/troupes/" + window.troupeContext.troupe.id + "/users/" + this.model.get('id'),
              data: "",
              type: "DELETE",
              success: function(data) {
                console.log("Removed this person");
                thisPerson.$el.toggle();
              }
            });
      });

      view.on('confirm.no', function(data) {
        modal.off('confirm.no');
        modal.hide();
       });

      modal.show();

      return false;
    },

    removeUser: function() {
      var that = this;
      var thisPerson = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users/" + this.model.get('id'),
        data: "",
        type: "DELETE",
        success: function(data) {
          console.log("Removed this person");
          thisPerson.$el.toggle();
        }
      });
      return false;
    }
  });

});
