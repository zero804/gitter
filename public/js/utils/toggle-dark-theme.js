'use strict';

var cdn = require('gitter-web-cdn');

module.exports = function toggleDarkTheme(shouldAdd){

  if(shouldAdd) {
    //Build a new link element
    darkThemeLink = document.createElement('link');
    darkThemeLink.rel = 'stylesheet';
    darkThemeLink.id = 'gitter-dark';
    darkThemeLink.media = 'all';
    darkThemeLink.type = 'text/css';
    darkThemeLink.href = cdn('styles/dark-theme.css');

    //Add it to the head
    document.head.appendChild(darkThemeLink);
  }

  var darkThemeLink = document.getElementById('gitter-dark');
  return darkThemeLink.remove();
}
