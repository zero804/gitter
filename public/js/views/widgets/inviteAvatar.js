/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'hbs!./tmpl/inviteAvatar',
  'bootstrap_tooltip'
], function($, TroupeViews, template) {

  "use strict";

  return TroupeViews.Base.extend({
    tagName: 'div',
    template: template,
    initialize: function(options) {
      // var self = this;
      if(!this.model) this.model = options.troupe;

      // this.listenTo(this.model, 'change', this.avatarChange);
      // this.addCleanup(function() {
      //   self.stopListening();
      // });
    },

    afterRender: function() {
      this.$el.find(':first-child').tooltip({
        html : true,
        placement : function(a, element) {
          var position = $(element).position();
          if (position.top < 110){
            return "bottom";
          }

          return "top";
        },
        container: "body"
      });
    }

  });

});
