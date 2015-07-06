"use strict";

var LoadingView = function(iframe, loadingFrame) {
  var self = this;
  this.iframe = iframe;
  this.loadingFrame = loadingFrame;

  function onIframeLoad() {
    self.hide();

    // now that we have a new content window,
    // we have to attach a new unload listener
    // as the old content window has been destroyed
    self.iframe.contentWindow.addEventListener('beforeunload', function() {
      self.show();
    });
  }

  if (this.iframe.contentDocument.readyState === 'complete') {
    // iframe has already loaded.
    // such a speedy iframe!
    onIframeLoad();
  }

  // prepare for all future iframe loads
  this.iframe.addEventListener('load', onIframeLoad);
};

LoadingView.prototype.show = function() {
  this.loadingFrame.classList.remove('hide');
};

LoadingView.prototype.hide = function() {
  this.loadingFrame.classList.add('hide');
};

module.exports = LoadingView;
