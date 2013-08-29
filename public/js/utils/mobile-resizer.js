/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['jquery'], function($) {
  "use strict";

  var hideAddessBar = function() {
    var $body = $('body');
    $body.height( $body.height() + 600 );
    // has to be 1 pixel for Android
    window.scrollTo(0, 1);
    $body.height( window.innerHeight );
  };

  var reset = function() {
    hideAddessBar();
  };

  return {
    'reset': reset
  };
});
