define([
], function() {
  /*jslint browser: true*/
  "use strict";

  // deprecated
  return {
    'mail': function() {
      this.showAsync('views/conversation/conversationView');
    },

    'mail/:id': function(id) {
      this.showAsync("views/conversation/conversationDetailView",id);
    }
  };
});