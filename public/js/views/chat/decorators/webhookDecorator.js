/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/base',
  'utils/context',
  'hbs!./tmpl/github',
  'hbs!./tmpl/bitbucket',
  'hbs!./tmpl/jenkins',
  'hbs!./tmpl/travis',
  'hbs!./tmpl/sprintly',
  'hbs!./tmpl/generic',
  'hbs!./tmpl/trello',
  'hbs!./tmpl/gitter'
], function(
  TroupeViews,
  context,
  githubTemplate,
  bitbucketTemplate,
  jenkinsTemplate,
  travisTemplate,
  sprintlyTemplate,
  genericTemplate,
  trelloTemplate,
  gitterTemplate
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

  var SprintlyView = TroupeViews.Base.extend({
    template: sprintlyTemplate
  });

  var TrelloView = TroupeViews.Base.extend({
    template: trelloTemplate
  });

  var GitterView = TroupeViews.Base.extend({
    template: gitterTemplate
  });

  function showNotificationIcon(chatItemView, meta) {
    // NB NB NB: update the matching list at
    // server/web/prerender-chat-helper.js
    var favicons = {
      github:     'https://github.com/favicon.ico',
      bitbucket:  'https://bitbucket.org/favicon.ico',
      jenkins:    'https://jenkins-ci.org/sites/default/files/jenkins_favicon.ico',
      sprintly:   'https://sprint.ly/favicon.ico',
      travis:     'https://travis-ci.org/favicon.ico',
      trello:     'https://trello.com/favicon.ico',
      gitter:     'https://gitter.im/images/2/gitter/favicon5.png'
    };

    // NB NB NB: update the matching list at
    // server/web/prerender-chat-helper.js
    var human_actions = {
      push:           'pushed',
      issues:         'an issue',
      issue_comment:  'commented on an issue',
      commit_comment: 'commented on a commit',
      pull_request:   'a Pull Request',
      gollum:         'updated the wiki',
      fork:           'forked',
      member:         'as member to',
      public:         'made public',
      watch:          'started watching'
    };


    var viewData = meta;
    viewData.favicon = favicons[meta.service];
    viewData.baseUri = context.env('basePath');

    var webhookView;

    switch (meta.service) {
      case 'github':
        viewData.human_action = human_actions[meta.event];
        webhookView = new GithubView();
        break;
      case 'bitbucket':
        webhookView = new BitbucketView();
        break;
      case 'jenkins':
        webhookView = new JenkinsView();
        break;
      case 'travis':
        webhookView = new TravisView();
        break;
      case 'sprintly':
        webhookView = new SprintlyView();
        break;
      case 'trello':
        webhookView = new TrelloView();
        break;
      case 'gitter':
        webhookView = new GitterView();
        break;
      default:
        webhookView = new GenericView();
        break;
    }

    webhookView.data = viewData;
    chatItemView.$el.find('.trpChatText').html(webhookView.render().el);

    //var iconHtml = '<img class="notification-icon" src="' + favicons[meta.service]  + '">';
    //chatItemView.$el.find('.trpChatText').prepend(iconHtml);

    // This could be moved to the template render, is here temporarily.
    chatItemView.$el.find('.trpChatBox').addClass('webhook');
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
