define([
  'utils/context',
], function(context) {
  "use strict";

  var roomUri = context.troupe().get('uri');

  return {
    generateTwitterShareUrl: function() {
      var text = encodeURIComponent('Join the chat room on Gitter for ' + roomUri + ':');
      var url = 'https://twitter.com/share?' +
        'text=' + text +
        '&url=https://gitter.im/' + roomUri +
        '&related=gitchat' +
        '&via=gitchat';

      return url;
    },
    generateFacebookShareUrl: function() {
      return 'http://www.facebook.com/sharer/sharer.php?u=https://gitter.im/' + roomUri;
    }
  };

});
