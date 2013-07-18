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
    var inputSize = document.getElementById('chat-input').clientHeight;
    var newHeight = window.innerHeight - inputSize;
    var chatWrapper = document.getElementById('chat-wrapper');
    chatWrapper.style.height = newHeight + 'px';
  };

  var resizeChatWrapperToFit = function() {
    resetChatWrapperSize();
    if(isPageTooBig()) {
      shrinkChatWrapperToFit();
    }
  };

  var resetChatWrapperSize = function() {
    var chatWrapper = document.getElementById('chat-wrapper');
    chatWrapper.style.height = '100%';
  };

  return {
    'hideAddessBar': hideAddessBar,
    'resizeChatWrapperToFit': resizeChatWrapperToFit
  };
});
