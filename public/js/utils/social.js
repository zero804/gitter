"use strict";
var context = require('utils/context');


module.exports = {
  generateTwitterShareUrl: function() {
    var roomUri = context.troupe().get('uri');

    var text = encodeURIComponent('Join the chat room on Gitter for ' + roomUri + ':');
    var url = 'https://twitter.com/share?' +
      'text=' + text +
      '&url=https://gitter.im/' + roomUri +
      '&related=gitchat' +
      '&via=gitchat';

    return url;
  },
  
  generateFacebookShareUrl: function() {
    var roomUri = context.troupe().get('uri');

    return 'http://www.facebook.com/sharer/sharer.php?u=https://gitter.im/' + roomUri;
  },

  generateLinkedinShareUrl: function() {
    var roomUri = context.troupe().get('uri');

    var text = encodeURIComponent('Join the chat room on Gitter for ' + roomUri);
    var url = 'https://www.linkedin.com/shareArticle?' +
      'mini=true' +
      '&url=https://gitter.im/' + roomUri +
      '&title=' + roomUri + ' on Gitter' +
      '&summary=' + text +
      '&source=Gitter';

    return url;
  },

  generateGooglePlusShareUrl: function() {
    var roomUri = context.troupe().get('uri');

    return 'https://plus.google.com/share?url=https://gitter.im/' + roomUri;
  }
};
