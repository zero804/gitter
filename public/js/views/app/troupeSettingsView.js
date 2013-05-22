define([
  'views/base',
  'collections/desktop',
  'hbs!./tmpl/troupeSettingsTemplate',
  'log!troupe-settings-view',
  'utils/validate-wrapper'
], function(TroupeViews, collections, troupeSettingsTemplate, log, validation) {

  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'submit #troupeSettings': 'saveSettings',
      'click #cancel-troupe-settings' : 'closeSettings',
      'click #delete-troupe': 'deleteTroupe',
      'click #leave-troupe': 'leaveTroupe'
    },

    initialize: function(options) {
      var self = this;
      this.model = collections.troupes.get(window.troupeContext.troupe.id);
      this.userCollection = collections.users;
      this.$el.toggleClass('canLeave', this.canLeave());
      this.$el.toggleClass('canDelete', this.canDelete());
    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {
      this.validateForm();
    },

    canDelete: function() {
      return this.userCollection.length == 1;
    },

    deleteTroupe: function() {
      var self = this;

      if (!this.canDelete()) {
        return alert("You need to be the only person in the troupe to delete it.");
      }

      TroupeViews.confirm("Are you sure you want to delete this troupe?", {
        'click #ok': function() {

          window.troupeContext.troupeIsDeleted = true;

          $.ajax({
            url: '/troupes/' + self.model.id,
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
        }
      });
    },

    canLeave: function() {
      return this.userCollection.length > 1;
    },

    leaveTroupe: function() {
      var errMsg = "You cannot leave a troupe if you are the only member, rather delete it.";

      if (!this.canLeave()) {
        return alert(errMsg);
      }

      TroupeViews.confirm("Are you sure you want to remove yourself from this troupe?", {
        'click #ok': function() {
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
        }
      });

    },

    getRenderData: function() {
      return _.extend({},
        window.troupeContext.troupe, {
        canLeave: this.canLeave(),
        canDelete: this.canDelete()
      });
    },

    validateForm : function () {
      console.log("Validate init");
      var validateEl = this.$el.find('#troupeSettings');
      validateEl.validate({
        rules: {
          name: validation.rules.troupeName()
        },
        messages: {
          name: validation.messages.troupeName()
        },
        showErrors: function(errorMap) {
          var errors = "";

          _.each(_.keys(errorMap), function(key) {
            var errorMessage = errorMap[key];
            errors += errorMessage + "<br>";
          });

          $('#failure-text').html(errors);
          if(errors) {
            $('#request_validation').show();
          } else {
             $('#request_validation').hide();
          }
        }
     });
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

  return TroupeViews.Modal.extend({
      initialize: function(options) {
        options.title = "Settings";
        TroupeViews.Modal.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      }
    });
  });
