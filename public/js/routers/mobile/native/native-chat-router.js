/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require(['routers/mobile/mobile-router'], function(MobileRouter) {
  "use strict";

  var NativeChatRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      // Prevent Header & Footer From Showing Browser Chrome
      document.addEventListener('touchmove', function(event) {
         if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
        event.preventDefault(); }
      }, false);
    }
  });

  new NativeChatRouter();

});
