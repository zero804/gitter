/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([], function() {
  "use strict";

  var hideAddessBar = function() {
    // has to be 1 pixel for Android
    window.scrollTo(0, 1);
  };

  var isPageTooBig = function() {
    // document.height is depricated, but ios UIWebView doesnt work well with document.body.clientHeight
    return window.innerHeight < document.height;
  };

  var shrinkChatWrapperToFit = function() {
    var chatWrapper = document.getElementById('chat-wrapper');
    var everythingButWrapperSize = document.height - chatWrapper.clientHeight;
    var spaceForWrapper = window.innerHeight - everythingButWrapperSize;
    chatWrapper.style.height = spaceForWrapper + 'px';
  };

  var resizeChatWrapperToFit = function() {
    if(isPageTooBig()) {
      shrinkChatWrapperToFit();
    }
  };

  var resetChatWrapperSize = function() {
    var chatWrapper = document.getElementById('chat-wrapper');
    chatWrapper.style.height = '100%';
  };

  var reset = function() {
    resetChatWrapperSize();
    hideAddessBar();
    resizeChatWrapperToFit();
  };

  return {
    'hideAddessBar': hideAddessBar,
    'resizeChatWrapperToFit': resizeChatWrapperToFit,
    'reset': reset
  };
});
