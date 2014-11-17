"use strict";

var $script = require("scriptjs");

module.exports = {
  install: function(element, user) {
    $script("//widget.uservoice.com/Ytskh71stLFzOjhraowHg", function() {
      if(!window.UserVoice) {
        window.UserVoice = [];
      }

      var UserVoice = window.UserVoice || [];

      UserVoice.push(['set', {
        accent_color: '#6aba2e',
        trigger_color: 'white',
        target: '#help-icon',
        smartvote_enabled: false,
        trigger_background_color: 'rgba(46, 49, 51, 0.6)'
      }]);

      // Autoprompt for Satisfaction and SmartVote (only displayed under certain conditions)
      UserVoice.push(['autoprompt', {}]);
      UserVoice.push(['addTrigger', element[0], { }]);
      UserVoice.push(['identify', {
        name: user.username,
        id: user.id
      }]);

    });

  }
};



