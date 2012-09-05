// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./signupModalView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
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
            window.location.href = "/" + data.redirectTo;
          }
          else {
             that.trigger('signup.complete', data);
           }
        }
      });
    }
  });

});