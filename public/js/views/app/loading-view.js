"use strict";

var LoadingView = function(iframe, loadingFrame) {
  var self = this;
  this.iframe = iframe;
  this.loadingFrame = loadingFrame;

  function onIframeLoad() {
    self.hide();

    // now that we have a new content window,
    // we have to attach new unload listeners
    // as the old content window has been destroyed
    self.iframe.contentWindow.addEventListener('beforeunload', function() {
      // iframe is about to be destroyed, but another listener could abort this process
      // showing the spinner on unload however, feels too slow.
      self.show();
    });

    self.iframe.contentWindow.addEventListener('unload', function() {
      // the exiting contentDocument is about to be destroyed, but the
      // iframe's new contentDocument will be instantiated in the next event loop.
      setTimeout(function() {
        self.iframe.contentDocument.addEventListener('DOMContentLoaded', onIframeLoad);
      }, 0)
    });
  }

  var readyState = this.iframe.contentDocument.readyState;

  if (readyState === 'interactive' || readyState === 'complete') {
    // iframe has already loaded.
    // such a speedy iframe!
    onIframeLoad();
  }

  // this will fire before the iframe's full window load,
  // but the contentDocument will get destroyed on navigation
  this.iframe.contentDocument.addEventListener('DOMContentLoaded', onIframeLoad);

  // listen on the iframe window, just to be sure
  // this is slow as it waits for images to load, even if the readyState is "interactive"
  this.iframe.addEventListener('load', onIframeLoad);
};

LoadingView.prototype.show = function() {
  this.loadingFrame.classList.remove('hide');
};

LoadingView.prototype.hide = function() {
  this.loadingFrame.classList.add('hide');
};

module.exports = LoadingView;
