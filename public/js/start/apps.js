/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/platformDetect'
], function($, platformDetect) {
  "use strict";

  return function() {
  
 function gotoLast() {
  window.location.href="./finish";
 }

 function downloadURL(url) {
    var hiddenIFrameID = 'hiddenDownloader',
        iframe = document.getElementById(hiddenIFrameID);
    if (iframe === null) {
        iframe = document.createElement('iframe');
        iframe.id = hiddenIFrameID;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    iframe.src = url;
}

   $('#download-button').on('click', function() {
    var url;
    if (platformDetect() == 'Mac') {
      url = 'https://s3.amazonaws.com/update.trou.pe/troupe-notifier/beta/latest';
    }
    if (platformDetect() == 'Windows') {
      url = 'http://update.trou.pe/windows/latest.html';
    }
    downloadURL(url);
    window.setTimeout(gotoLast, 2000);
   });

  };

});