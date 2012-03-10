// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/login/login.mustache'
], function($, _, Backbone, Mustache, template) {
  var MainHomeView = Backbone.View.extend({    
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
        self.router.navigate("");
      });
      
      this.$el.modal('show');
    },
    
    signinClicked: function() {
      var self = this;
      $.post("/login", this.$el.find("form").serialize(), function(data, textStatus, jqXHR) {
        if(!data.failed) {
          self.$el.modal('hide');
          return;
        }
        
        var incorrectBox = $('.incorrect-password', self.$el);
        if(incorrectBox.is(":visible")) {
          incorrectBox.effect("highlight", {}, "normal");
        } else {
          incorrectBox.show('fast');
        }
      });

      return false;
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    }
    
  });

  return MainHomeView;
});
