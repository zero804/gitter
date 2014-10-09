define([
  'underscore',
  'marionette',
  'utils/appevents',
  'views/base',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'log!activity',
  'utils/context',
  'hbs!./tmpl/activity-tip',

  'hbs!./tmpl/githubPush',
  'hbs!./tmpl/githubIssues',
  'hbs!./tmpl/githubIssueComment',
  'hbs!./tmpl/githubCommitComment',
  'hbs!./tmpl/githubPullRequest',
  'hbs!./tmpl/githubGollum',
  'hbs!./tmpl/githubFork',
  'hbs!./tmpl/githubMember',
  'hbs!./tmpl/githubPublic',
  'hbs!./tmpl/githubWatch',

  'hbs!./tmpl/bitbucket',
  'hbs!./tmpl/huboard',
  'hbs!./tmpl/jenkins',
  'hbs!./tmpl/travis',
  'hbs!./tmpl/sprintly',
  'hbs!./tmpl/trello',
  'hbs!./tmpl/prerendered',

  'cocktail'
], function(
  _,
  Marionette,
  appEvents,
  TroupeViews,
  issueDecorator,
  commitDecorator,
  mentionDecorator,
  log,
  context,
  activityTipTemplate,

  githubPushTemplate,
  githubIssuesTemplate,
  githubIssueCommentTemplate,
  githubCommitCommentTemplate,
  githubPullRequestTemplate,
  githubGollumTemplate,
  githubForkTemplate,
  githubMemberTemplate,
  githubPublicTemplate,
  githubWatchTemplate,

  bitbucketTemplate,
  huboardTemplate,
  jenkinsTemplate,
  travisTemplate,
  sprintlyTemplate,
  trelloTemplate,
  prerenderedTemplate,

  cocktail
) {
  "use strict";

  var serviceTemplates = {
    bitbucket:  bitbucketTemplate,
    huboard:    huboardTemplate,
    jenkins:    jenkinsTemplate,
    travis:     travisTemplate,
    sprintly:   sprintlyTemplate,
    trello:     trelloTemplate
  };

  var githubTemplates = {
    push:           githubPushTemplate,
    issues:         githubIssuesTemplate,
    issue_comment:  githubIssueCommentTemplate,
    commit_comment: githubCommitCommentTemplate,
    pull_request:   githubPullRequestTemplate,
    gollum:         githubGollumTemplate,
    fork:           githubForkTemplate,
    member:         githubMemberTemplate,
    public:         githubPublicTemplate,
    watch:          githubWatchTemplate
  };

  var decorators = {
    trello: function(meta, payload) {
      var trello_actions = {
        updateCard:   'updated',
        createCard:   'created',
        commentCard:  'commented',
        voteOnCard:   'voted',
      };
      return {trello_action: trello_actions[payload.action.type]};
    },
    sprintly: function(meta, payload) {
      var extra = {};

      if (payload.model == "Item") {
        extra.sprintly_action = "created";
      } else if (payload.model == "Comment") {
        extra.sprintly_action = "commented on";
      }
      return extra;
    },
    bitbucket: function(meta) {
      // meta.commits is undefined for empty arrays in old hooks.
      // this is because of issue #233 (form encoding was removing empty arrays)
      var commits = meta.commits || [];
      return {
        first_commit: commits[0],
        is_single_commit: commits.length === 1,
        commits_count: commits.length
      };
    },
    github: function(meta, payload) {
      var extra = {};

      if (meta.event == 'push') {
        // if you push a tag, then commits is undefined
        var commits = payload.commits || [];
        var commitCount = commits.length;

        extra.commits = commits;
        extra.commits.forEach(function(commit){
          commit.short_sha = commit.id.substring(0,7);
          var message = commit.message;
          commit.short_message = (message.length > 32) ? message.substr(0,31) + '…' : message;
        });

        if(commitCount > 3) {
          extra.commits = extra.commits.slice(0,3);
          extra.hidden_commit_count = commitCount - 3;
        }

        extra.commits_count = commitCount;

      } else if (meta.event == 'gollum') {
        extra.wiki_url = payload.pages[0].html_url;
        extra.wiki_page = payload.pages[0].page_name;
      } else if (meta.event === 'commit_comment') {
        // fall back to payload data for old hooks
        extra.commit = meta.commit || {
          id: payload.comment.commit_id,
          short_sha: payload.comment.commit_id.substring(0,7),
        };
      }
      return extra;
    },
    jenkins: function(meta, payload) {
      var status = payload.build.status ? payload.build.status.toLowerCase() : payload.build.phase.toLowerCase();
      return { build_status: status };
    },
    travis: function(meta, payload) {
      var extra = {};
      var status = payload.status_message ? payload.status_message.toLowerCase() : '';
      extra.build_status = (status === 'still failing') ? 'failing' : status;
      return extra;
    },
    huboard: function(meta) {
      var extra = {};
      var column = meta.column;
      var previousColumn = meta.previousColumn;

      if(meta.milestone) {
        extra.context = 'to '+meta.milestone;
      } else if(meta.status) {
        extra.context = 'to '+meta.status;
      } else if(column) {
        extra.context = previousColumn ? 'from '+previousColumn+' to '+column : 'in '+column;
      }
      return extra;
    }
  };

  function getExtraRenderData(meta, payload) {
    var decorator = decorators[meta.service];
    var extra = decorator ? decorator(meta, payload) : {};

    // Support branch names with slashes, ie: develop/feature/123-foo
    if (payload && payload.ref) {
      var refs = payload.ref.split('/');
      extra.branch_name = refs[3] ? refs[3] : refs[2];
      extra.repo = payload.repository.owner.name + '/' + payload.repository.name;
    }

    return extra;
  }



  var ActivityItemView = Marionette.ItemView.extend({
    tagName: 'li',
    modelEvents: {
      change: 'render'
    },

    initialize: function() {
      var meta = this.model.get('meta');
      var service = meta.service;

      if (service == 'github') {
        var event = meta.event;
        this.template = githubTemplates[event];
      } else {
        if(!meta.prerendered) {
          this.template = serviceTemplates[service];
        } else {
          this.template = prerenderedTemplate;
        }
      }
    },

    serializeData: function() {
      try{
        var meta    = this.model.get('meta');
        var payload = this.model.get('payload');
        var sent    = this.model.get('sent');
        var html    = this.model.get('html');

        var core = {
          meta: meta,
          payload: payload,
          sent: sent,
          html: html
        };

        var extra = meta.prerendered ? {} : getExtraRenderData(meta, payload);
        return _.extend(core, extra);
      } catch(e) {
        var modelData = this.model && this.model.attributes;
        appEvents.trigger('bugreport', e, { extra: modelData });
        log('ERROR rendering activity item:', e.message, e.stack, modelData);
        return {};
      }
    },

    onRender: function() {
      issueDecorator.decorate(this);
      commitDecorator.decorate(this);
      mentionDecorator.decorate(this);
    }
  });

  var EmptyActivityView = Marionette.ItemView.extend({
    id: 'activity-tip',
    template: activityTipTemplate,
    serializeData: function() {
      return {
        isAdmin: context().permissions.admin,
        isNativeDesktopApp: context().isNativeDesktopApp,
        integrationsUrl: context().isNativeDesktopApp ? window.location.origin + '/' + context.troupe().get('uri') + '#integrations' : '#integrations'
      };
    }
  });

  var ActivityView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'gtrActivityList',
    itemView: ActivityItemView,
    emptyView: EmptyActivityView
  });
  cocktail.mixin(ActivityView, TroupeViews.SortableMarionetteView);

  return ActivityView;

});
