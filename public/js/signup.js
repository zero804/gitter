/*jshint strict:true, undef:true, unused:strict, browser:true *//*global require:false */
require([
  'jquery',
  'jquery-slideshow',
  'retina' //noref
 ],
  function($,jquerySlideshow) {
    "use strict";

    require([
      'utils/tracking'
    ], function() {
      // No need to do anything here
    });

    $(document).ready(function(){
        $('#slideshow').fadeSlideShow({
          width: 920,
          height: 611
        });
    });

    $('.scroll-link').click(function(){
    $('html, body').animate({
        scrollTop: $( $.attr(this, 'href') ).offset().top
    }, 500);
    return false;
    });
});



