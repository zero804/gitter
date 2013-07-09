/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'views/base',
  'collections/instances/troupes',
  'collections/instances/integrated-items',
  'hbs!./tmpl/troupeSettingsTemplate',
  'log!troupe-settings-view',
  'utils/validate-wrapper'
], function(context, TroupeViews, troupeCollections, itemCollections, troupeSettingsTemplate, log, validation) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'submit #troupeSettings': 'saveSettings',
      'click #cancel-troupe-settings' : 'closeSettings',
      'click #delete-troupe': 'deleteTroupe',
      'click #leave-troupe': 'leaveTroupe'
    },

    initialize: function() {
      this.model = troupeCollections.troupes.get(context.getTroupeId());
      this.userCollection = itemCollections.users;
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
            type: "DELETE",
            success: function() {
              window.location.href = '/last';
            },
            error: function(jqXHR, textStatus, e) {
              log('Error attempting to delete troupe', textStatus, e);
            }
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
            url: "/troupes/" + context.getTroupeId() + "/users/" + context.getUserId(),
            data: "",
            type: "DELETE",
            success: function() {
              window.location = context().homeUrl;
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
        url: '/troupes/' + context.getTroupeId(),
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
