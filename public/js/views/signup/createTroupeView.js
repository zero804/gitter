/*jshint unused:true browser:true*/
// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/createTroupeView',
  'jquery_validate',
  'jquery_placeholder'
], function($, _, TroupeViews, template) {
  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
      if (!options) return;
      this.existingUser = options.existingUser;
    },

    events: {
      "submit form": "onFormSubmit"
    },

    getRenderData: function() {
      if (window.troupeContext) {
        userId = window.troupeContext.user.id;
        return {
          existingUser: this.existingUser,
          userId: userId
        };
      } else {
        return {
          existingUser: this.existingUser
        };
     }
    },

    afterRender : function() {
      this.validateForm();
      var troupeEl = this.$el.find('#troupeName');
      troupeEl.placeholder();
      var emailEl = this.$el.find('#email');
      emailEl.placeholder();
    },

    validateForm : function () {
      var validateEl = this.$el.find('#signup-form');
      validateEl.validate({
        debug: true,
        showErrors: function(errorMap, errorList) {
          if (errorList.length > 0) $('.signup-failure').show();
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        },
        messages: {
          troupeName: {
            minlength: "Please choose a longer name for your Troupe, it needs to be at least 4 letters.",
            required: "Please choose a name for your Troupe. "
          },
        email : {
          required: "We need to know your email address",
          email: "Hmmm, that doesn't look like your email address."
          }
        }
        });
    },

    onFormSubmit: function(e) {
      if(e) e.preventDefault();
      var form = this.$el.find('form');
      var that = this;

      $.ajax({
        url: "/signup",
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        success: function(data) {
          if (data.redirectTo) {
            console.log(JSON.stringify(data));
            window.location.href = "/" + data.redirectTo + "#|shareTroupe";
          }
          else {
             that.trigger('signup.complete', data);
           }
        }
      });
    }

  });

var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
