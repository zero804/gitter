"use strict";

module.exports = {
  currentView: null,
  show: function(view) {
    if(this.currentView) {
      var cv = this.currentView;
      cv.hideInternal();
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
