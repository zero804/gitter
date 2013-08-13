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
    var chatWrapper = document.getElementById('content-frame');
    var everythingButWrapperSize = document.height - chatWrapper.clientHeight;
    var spaceForWrapper = window.innerHeight - everythingButWrapperSize;
    chatWrapper.style.height = spaceForWrapper + 'px';
  };

  var setPageWidth = function() {
    document.getElementById('mainPage').style.width = window.innerWidth+"px";
  };

  var resizeChatWrapperToFit = function() {
    if(isPageTooBig()) {
      shrinkChatWrapperToFit();
    }
  };

  var resetChatWrapperSize = function() {
    var chatWrapper = document.getElementById('content-frame');
    chatWrapper.style.height = '1000px';
  };

  var reset = function() {
    resetChatWrapperSize();
    setPageWidth();
    hideAddessBar();
    resizeChatWrapperToFit();
  };

  return {
    'reset': reset
  };
});
