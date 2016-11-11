'use strict';

var cdn = require('gitter-web-cdn');
var frameUtils = require('gitter-web-frame-utils');

module.exports = function toggleDarkTheme(isChildFrame){

  isChildFrame = frameUtils.hasParentFrameSameOrigin();
  var darkThemeLink = document.getElementById('dark-theme-styles');

  //If we have a reference to the dark-theme script we remove it
  if(darkThemeLink) {

    //actually remove the script from the document
    darkThemeLink.remove();

    //We only want to post the message up into the parent framw if we
    //are inside a child iframe
    if(!isChildFrame) { return; }

    //Tell the parent frame to remove the dark-theme script in the css
    return frameUtils.postMessage({ type: 'toggle-dark-theme' });
  }

  //Build a new link element
  darkThemeLink = document.createElement('link');
  darkThemeLink.rel = 'stylesheet';
  darkThemeLink.id = 'dark-theme-styles';
  darkThemeLink.media = 'all';
  darkThemeLink.type = 'text/css';
  darkThemeLink.href = cdn('styles/dark-theme.css');

  //Add it to the head
  document.head.appendChild(darkThemeLink);

  //We only want to past to the parent frame if we are actuallyin the child iFrame
  if(!isChildFrame) { return; }

  //Tell the parent frame to add the script
  frameUtils.postMessage({ type: 'toggle-dark-theme' });

}
