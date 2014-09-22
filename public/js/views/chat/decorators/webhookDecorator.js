/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'views/base',
  'marionette',
  'hbs!./tmpl/github',
  'hbs!./tmpl/githubPush',
  'hbs!./tmpl/bitbucket',
  'hbs!./tmpl/jenkins',
  'hbs!./tmpl/travis',
  'hbs!./tmpl/sprintly',
  'hbs!./tmpl/trello'
], function(
  TroupeViews,
  Marionette,
  githubTemplate,
  githubPushTemplate,
  bitbucketTemplate,
  jenkinsTemplate,
  travisTemplate,
  sprintlyTemplate,
  trelloTemplate
) {

  "use strict";

  var serviceTemplates = {
    bitbucket:  bitbucketTemplate,
    jenkins:    jenkinsTemplate,
    travis:     travisTemplate,
    sprintly:   sprintlyTemplate,
    trello:     trelloTemplate
  };

  function selectServiceView(service) {
    var template = serviceTemplates[service];
    if(!template) return null;

    var view = Marionette.ItemView.extend({
      template: template
    });

    return view;
  }

  var GithubView = Marionette.ItemView.extend({
    template: githubTemplate
  });

  var GithubPushView = Marionette.ItemView.extend({
    template: githubPushTemplate,
    events: {
      'click .toggleCommits': 'toggleCommits'
    },
    toggleCommits: function() {
      this.$el.find('.commits').slideToggle(100);
    }
  });

  function selectGithubView(event) {
    switch (event) {
      case 'push':
        return GithubPushView;
      default:
        return GithubView;
    }
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

    var Klass;
    switch (meta.service) {
      case 'github':
        Klass = selectGithubView(meta.event);
        break;
      default:
        Klass = selectServiceView(meta.service);
        break;
    }
    if(!Klass) return;

    var webhookView = new Klass();

    webhookView.data = viewData;
    chatItemView.$el.find('.trpChatItem').html(webhookView.render().el);

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
