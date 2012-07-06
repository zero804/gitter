// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hgn!templates/login/login'
], function($, _, Backbone, template) {
  var LoginView = Backbone.View.extend({    
    tagName: "div",
    className: "modal hide fade",

    events: {
      "submit #loginForm":          "signinClicked"
    },
    
    initialize: function(options) {
     this.router = options.router;
    },
    
    show: function() {
      var r = this.render();
      var el = r.el;
      
      $('body').append(el);

      var self = this;
      this.$el.on('hidden', function () {
        self.remove();
        window.location.href = "/";
      });
      
      this.$el.modal('show');
    },
    
    signinClicked: function() {
      var self = this;
      $.ajax({
        type: 'POST',
        url: "/login",
        data: this.$el.find("form").serialize(),
        success: function(data, textStatus, jqXHR) {
          if(!data.failed) {
            window.location.reload();
            return;
          }
          
          var incorrectBox = $('.incorrect-password', self.$el);
          if(incorrectBox.is(":visible")) {
            incorrectBox.effect("highlight", {}, "normal");
          } else {
            incorrectBox.show('fast');
          }
        },
        dataType: 'json'
      });

      return false;
    },
    
    render: function() {
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      return this;
    }
    
  });

  return LoginView;
});
