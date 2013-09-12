/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/troupeAvatar',
  'bootstrap_tooltip'
], function(TroupeViews, template) {

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
    }

  });

});
