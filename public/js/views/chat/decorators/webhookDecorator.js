/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/base',
  'hbs!./tmpl/github',
  'hbs!./tmpl/githubPush',
  'hbs!./tmpl/bitbucket',
  'hbs!./tmpl/jenkins',
  'hbs!./tmpl/travis',
  'hbs!./tmpl/sprintly',
  'hbs!./tmpl/trello'
], function(
  TroupeViews,
  githubTemplate,
  githubPushTemplate,
  bitbucketTemplate,
  jenkinsTemplate,
  travisTemplate,
  sprintlyTemplate,
  trelloTemplate
) {

  "use strict";

  function selectServiceView(service) {
    var serviceTemplates = {
      bitbucket:  bitbucketTemplate,
      jenkins:    jenkinsTemplate,
      travis:     travisTemplate,
      sprintly:   sprintlyTemplate,
      trello:     trelloTemplate
    };

    var view = TroupeViews.Base.extend({
      template: serviceTemplates[service]
    });

    return view;
  }

  function selectGithubView(event) {
    var eventView;

    switch (event) {
      case 'push':
        eventView = TroupeViews.Base.extend({
          template: githubPushTemplate,
          events: {
            'click .toggleCommits': 'toggleCommits'
          },
          toggleCommits: function() {
            this.$el.find('.commits').slideToggle(100);
          }
        });
        break;
      default:
        eventView = TroupeViews.Base.extend({
          template: githubTemplate
        });
        break;
    }

    return eventView;
  }

  function showNotificationIcon(chatItemView, meta) {

    // NB NB NB: update the matching list at
    // server/web/prerender-chat-helper.js
    var favicons = {
      github:     'https://github.com/favicon.ico',
      bitbucket:  'https://bitbucket.org/favicon.ico',
      jenkins:    'https://jenkins-ci.org/sites/default/files/jenkins_favicon.ico',
      sprintly:   'https://sprint.ly/favicon.ico',
      travis:     'https://travis-ci.org/favicon.ico',
      trello:     'https://trello.com/favicon.ico'
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

    var viewData          = meta;
    viewData.favicon      = favicons[meta.service];
    viewData.human_action = human_actions[meta.event];

    var klass;
    switch (meta.service) {
      case 'github':
        klass = selectGithubView(meta.event);
        break;
      default:
        klass = selectServiceView(meta.service);
        break;
    }

    var webhookView = new klass();

    webhookView.data = viewData;
    chatItemView.$el.find('.trpChatText').html(webhookView.render().el);

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
