'use strict';

var cdn = require('gitter-web-cdn');

var scriptID = 'gitter-dark';

module.exports = function toggleDarkTheme(shouldAdd){

  if(shouldAdd) {
    //Build a new link element
    darkThemeLink = document.createElement('link');
    darkThemeLink.rel = 'stylesheet';
    darkThemeLink.id = scriptID;
    darkThemeLink.href = cdn('styles/dark-theme.css');

    //Add it to the head
    return document.head.appendChild(darkThemeLink);
  }

  var darkThemeLink = document.getElementById(scriptID);
  return darkThemeLink.remove();
}
