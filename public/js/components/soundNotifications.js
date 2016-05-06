"use strict";
var $ = require('jquery');

module.exports = (function() {


  function play(sound) {
      var snd = new Audio(sound);
      snd.play();
  }


  function getSupportedAudioType() {
    var snd = new Audio('');
    if(snd.canPlayType('audio/ogg')) {
      return "ogg";
    } else if(snd.canPlayType('audio/mp3')) {
      return 'mp3';
    } else {
      return "wav";
    }
  }

  var module = {
    enabled: !!window.HTMLAudioElement,

    install: function() {
      var extension = getSupportedAudioType();
      $(document).on('chat', function() {
        play('/sounds/newChat.' + extension);
      });

      $(document).on('file', function() {
        play('/sounds/newFile.' + extension);
      });

      $(document).on('mail', function() {
        play('/sounds/newMail.' + extension);
      });

    }
  };

  if(module.enabled) {
    module.install();
  }

  return module;

})();
