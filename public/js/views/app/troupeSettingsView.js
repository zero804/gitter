define([
  'views/base',
  'collections/desktop',
  'hbs!./tmpl/troupeSettingsTemplate'
], function(TroupeViews, collections, troupeSettingsTemplate) {

  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'submit #troupeSettings': 'saveSettings'
    },

    initialize: function(options) {
      var self = this;
      this.model = collections.troupes.get(window.troupeContext.troupe.id);
      this.userCollection = collections.users;
      this.on('button.click', function(id) {
        switch(id) {
          case 'save-troupe-settings':
            self.saveSettings();
            break;
          case 'cancel-troupe-settings':
            self.dialog.hide();
            self.dialog = null;
            break;
          case 'delete-troupe':
            self.deleteTroupe();
            break;
          case 'leave-troupe':
            self.leaveTroupe();
            break;
        }
      });

    },

    deleteTroupe: function() {

      if (this.userCollection.length > 1) {
        return alert("You need to be the only person in the troupe to delete it.");
      }

      if (!confirm("Are you sure you want to delete this troupe?")) {
        return;
      }

      window.troupeContext.troupeIsDeleted = true;

      var self = this;
      $.ajax({
        url: '/troupes/' + this.model.id,
        contentType: "application/json",
        dataType: "json",
        type: "DELETE",
        success: function() {
          self.dialog.hide();
          self.dialog = null;

        },
        error: function() {
          alert("Unable to delete the troupe, you need to be the only person in the troupe to delete it.");
        },
        global: false
      });

    },

    leaveTroupe: function() {
      var errMsg = "You cannot leave a troupe if you are the only member, rather delete it.";

      if (this.userCollection.length == 1) {
        return alert(errMsg);
      }

      if (!confirm("Are you sure you want to remove yourself from this troupe?")) {
        return;
      }

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users/" + window.troupeContext.user.id,
        data: "",
        type: "DELETE",
        success: function(data) {
          window.location = window.troupeContext.homeUrl;
        },
        error: function() {
          alert(errMsg);
        },
        global: false
      });
    },

    getRenderData: function() {
      return window.troupeContext.troupe;
    },

    saveSettings: function(e) {
      if(e) e.preventDefault();

      var troupeName = this.$el.find('input[name=name]').val().trim();
      var self = this;

      if(window.troupeContext.troupe.name === troupeName) {
        self.dialog.hide();
        self.dialog = null;
        return;
      }

      window.troupeContext.troupe.name = troupeName;

      $.ajax({
        url: '/troupes/' + window.troupeContext.troupe.id,
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ name: troupeName }),
        success: function() {
          self.dialog.hide();
          self.dialog = null;
        }
      });
    }
  });

  return TroupeViews.ConfirmationModal.extend({
    initialize: function(options) {
      options.title = "Settings for this Troupe";
      options.buttons = [{
        id: "save-troupe-settings",
        text: "Save"
      }, {
        id: "cancel-troupe-settings",
        text: "Cancel"
      }, {
        text: "Delete this Troupe",
        id: "delete-troupe"
      },
      {
        text: "Leave this Troupe",
        id: "leave-troupe"
      }
      ];
      options.confirmationView = new View({});
      options.confirmationView.dialog = this;
      TroupeViews.ConfirmationModal.prototype.initialize.apply(this, arguments);
    }
  });
});