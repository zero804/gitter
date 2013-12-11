/*jshint strict:true, undef:true, unused:strict, browser:true *//*global require:false */
require([
  'jquery',
  'retina' //noref
 ],
  function($) {
    "use strict";

    require([
      'utils/tracking'
    ], function() {
      // No need to do anything here
    });

    $('.scroll-link').click(function(){
    $('html, body').animate({
        scrollTop: $( $.attr(this, 'href') ).offset().top
    }, 500);
    return false;
    });
});



