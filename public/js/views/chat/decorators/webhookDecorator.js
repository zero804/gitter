/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/base',
  'hbs!./tmpl/github',
  'hbs!./tmpl/bitbucket',
  'hbs!./tmpl/jenkins',
  'hbs!./tmpl/generic',
], function(
  TroupeViews, 
  githubTemplate,
  bitbucketTemplate,
  jenkinsTemplate,
  travisTemplate,
  genericTemplate
) {

  "use strict";

  var GenericView = TroupeViews.Base.extend({
    template: genericTemplate
  });

  var GithubView = TroupeViews.Base.extend({
    template: githubTemplate
  });

  var BitbucketView = TroupeViews.Base.extend({
    template: bitbucketTemplate
  });

  var JenkinsView = TroupeViews.Base.extend({
    template: jenkinsTemplate
  });

  var TravisView = TroupeViews.Base.extend({
    template: travisTemplate
  });

  function showNotificationIcon(chatItemView, meta) {

    var favicons = {
      github:     'https://github.com/favicon.ico',
      bitbucket:  'https://bitbucket.org/favicon.ico',
      jenkins:    'https://jenkins-ci.org/sites/default/files/jenkins_favicon.ico',
      sprintly:   'https://sprint.ly/favicon.ico',
      travis:     'https://travis-ci.org/favicon.ico'
    };

    var human_actions = {
      push:           'pushed',
      issues:         'an issue',   
      issue_comment:  'commented on an issue',
      commit_comment: 'commented on a commit',
      pull_request:   'a Pull Request',
      gollum:         'updated the wiki',
      fork:           'forked',
      member:         'a member',
      public:         'made public'
    };


    var viewData = meta;
    viewData.favicon = favicons[meta.service];

    switch (meta.service) {
      case 'github':
        viewData.human_action = human_actions[meta.event];
        var webhookView = new GithubView();
        break;
      case 'bitbucket':
        var webhookView = new BitbucketView();
        break;
      case 'jenkins':
        var webhookView = new JenkinsView();
        break;
      case 'travis':
        var webhookView = new TravisView();
        break;
      default:
        var webhookView = new GenericView();
        break;
    }

    webhookView.data = viewData;
    chatItemView.$el.find('.trpChatText').html(webhookView.render().el);

    //var iconHtml = '<img class="notification-icon" src="' + favicons[meta.service]  + '">';
    //chatItemView.$el.find('.trpChatText').prepend(iconHtml);

    // This could be moved to the template render, is here temporarily.
    chatItemView.$el.find('.trpChatBox').addClass('transparent');
  }

  var decorator = {

    decorate: function(chatItemView) {
      var meta = chatItemView.model.get('meta');
      if (meta) {
        switch (meta.type) {
          case 'webhook':
            showNotificationIcon(chatItemView, meta);
            break;
        }
      }
    }

  };

  return decorator;

});
