/*jshint node:true */
"use strict";

module.exports = function (room) {
  var name;
  try {
    name = room.name.split('/').shift(); // if possible always get the first part of the url
  } catch (e) {
    name = '#'; // TODO add a placeholder default image at some point?
  } finally {
    return "https://avatars.githubusercontent.com/" + name;  
  }
};
