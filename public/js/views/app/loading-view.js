"use strict";

var log = require('../../utils/log');
var appEvents = require('../../utils/appevents');

var LoadingView = function(iframe, loadingFrame) {
  var self = this;
  this.iframe = iframe;
  this.loadingFrame = loadingFrame;
  var unloadTimeout;

  function onbeforeunload() {
    // iframe is about to be destroyed, but another listener could abort this process
    // showing the spinner on unload however, feels too slow.
    self.show();

    // if unload never shows, then beforeunload was aborted
    // usually with mailto links
    unloadTimeout = setTimeout(function() {
      self.hide();
    }, 500);
  }

  let onUnloadAttempts = 0;
  function onUnload() {
    // the unload hasnt been cancelled
    clearTimeout(unloadTimeout);

    // the exiting contentDocument is about to be destroyed, but the
    // iframe's new contentDocument will be instantiated in the next event loop.
    setTimeout(function() {
      if(self.iframe && self.iframe.contentDocument) {
        self.iframe.contentDocument.removeEventListener('DOMContentLoaded', onIframeLoad);
        self.iframe.contentDocument.addEventListener('DOMContentLoaded', onIframeLoad);
      }
      // Retry after another frame if the contentDocument does not exist yet
      else if(onUnloadAttempts < 3) {
        onUnload();
      }
      else {
        log.warn('Unable to hook iframe DOMContentLoaded event in loading-view');
      }
    }, 0);

    onUnloadAttempts++;
  }

  function onIframeLoad() {
    onUnloadAttempts = 0;
    self.hide();

    // now that we have a new content window,
    // we have to attach new unload listeners
    // as the old content window has been destroyed
    self.iframe.contentWindow.removeEventListener('beforeunload', onbeforeunload);
    self.iframe.contentWindow.addEventListener('beforeunload', onbeforeunload);

    self.iframe.contentWindow.removeEventListener('unload', onUnload);
    self.iframe.contentWindow.addEventListener('unload', onUnload);
  }

  var readyState = this.iframe.contentDocument.readyState;

  if (readyState === 'interactive' || readyState === 'complete') {
    // iframe has already loaded.
    // such a speedy iframe!
    onIframeLoad();
  }

  // this will fire when readyState is "interactive", but before the iframe's full window load.
  // However, the contentDocument will get destroyed on navigation
  this.iframe.contentDocument.addEventListener('DOMContentLoaded', onIframeLoad);

  // this will fire when readyState is "complete", after the 'DOMContentLoaded' event.
  // this is slow as it waits for images to load, but the iframe wont be destroyed on navigation
  this.iframe.addEventListener('load', onIframeLoad);

  // listen to our own load event as node-webkit 0.11.6 loses track
  // of the child iframe event listeners when the iframe.src changes (!)
  // https://github.com/nwjs/nw.js/issues/2867
  appEvents.on('childframe:loaded', onIframeLoad);
  appEvents.on('loading:true', this.show, this);
  appEvents.on('loading:false', this.hide, this);
};

LoadingView.prototype.show = function() {
  this.loadingFrame.classList.remove('hide');
};

LoadingView.prototype.hide = function() {
  this.loadingFrame.classList.add('hide');
};

module.exports = LoadingView;
