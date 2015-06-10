"use strict";


module.exports = (function() {

  return {
    currentView: null,
    show: function(view) {
      if(this.currentView) {
        this.currentView.hideInternal();
      }
      this.currentView = view;
      view.navigable = true;
      view.show();
    },
    destroy: function() {
      if(this.currentView) {
        this.currentView.navigationalHide();
        this.currentView = null;
      }
    }
  };

})();

