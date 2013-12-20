/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
], function() {
  'use strict';

  /* Thank you John Gruber */
  var MEGA_RE = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig;

  /**
   * Find links and make them into <a href=> style links
   *
   * The string should already be safe!
   */
  return function autolink(safeText) {
    if(!safeText) return "";

    safeText = safeText.replace(/&#x2F;/ig, '/');

    return safeText.replace(MEGA_RE, function(match) {
      return '<a href="' + match + '">' + match + '</a>';
    });
  };

});