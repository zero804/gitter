/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'utils/context',
  './tmpl/link.hbs'
], function($, context, link) {
  "use strict";

  function getRoomRepo() {
    var room = context.troupe();
    if(room.get('githubType') === 'REPO') {
      return room.get('uri');
    } else {
      return '';
    }
  }

  var decorator = {

    decorate: function(view) {
      var roomRepo = getRoomRepo();

      view.$el.find('*[data-link-type="issue"]').each(function() {
        var $issue = $(this);
        var repo = $issue.data('issueRepo') || roomRepo;
        var issueNumber = $issue.data('issue');

        if(repo && issueNumber) {
          $issue.html(link({
            href: 'https://github.com/' + repo + '/issues/' + issueNumber,
            content: '#' + issueNumber
          }));
        }
      });

      view.$el.find('*[data-link-type="mention"]').each(function() {
        var $mention = $(this);
        var username = $mention.data('screenName');

        if(username) {
          $mention.html(link({
            href: 'https://github.com/' + username,
            content: '@' + username
          }));
        }
      });

      view.$el.find('*[data-link-type="commit"]').each(function() {
        var $commit = $(this);
        var repo = $commit.data('commitRepo');
        var sha = $commit.data('commitSha');

        if(repo && sha) {
          var shortSha = sha.substring(0, 7);
          $commit.html(link({
            href: 'https://github.com/' + repo + '/commit/' + sha,
            content: repo + '@' + shortSha
          }));
        }
      });

    }
  };

  return decorator;

});
