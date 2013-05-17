define([
  'views/base',
  'hbs!./tmpl/troupeSettingsTemplate',
  'log!troupe-settings-view',
  'utils/validate-wrapper'
], function(TroupeViews, troupeSettingsTemplate, log, validation) {

  var View = TroupeViews.Base.extend({
    template: troupeSettingsTemplate,
    events: {
      'submit #troupeSettings': 'saveSettings',
      'click #cancel-troupe-settings' : 'closeSettings'
    },

    initialize: function(options) {
      var self = this;
    },

    closeSettings : function () {
      this.dialog.hide();
      this.dialog = null;
    },

    afterRender: function() {
      this.validateForm();
    },

    getRenderData: function() {
      return window.troupeContext.troupe;
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
