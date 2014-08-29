/*jshint node:true */
"use strict";

module.exports = function (roomWithContext) {
  return 'https://avatars.githubusercontent.com/' + roomWithContext.url.split('/')[1];
};
