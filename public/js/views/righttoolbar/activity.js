/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'underscore',
  'marionette',
  'utils/context',
  'views/base',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/mentionDecorator',
  'log!activity',
  'hbs!./tmpl/activityStream',

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

  'cocktail'
], function(
  _,
  Marionette,
  context,
  TroupeViews,
  issueDecorator,
  mentionDecorator,
  log,
  activityStreamTemplate,

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
    github: function(meta, payload) {
      var extra = {};

      if (meta.event == 'push') {
        var commitCount = payload.commits ? payload.commits.length : 0;

        if (commitCount == 1) {
          var message = payload.commits[0].message;
          extra.commit_text = (message.length > 34) ? message.substr(0,33) + '…' : message;
        } else if(commitCount > 1) {
          extra.multiple_commits = true;
        }

        extra.commits_count = commitCount;

      } else if (meta.event == 'gollum') {
        extra.wiki_url = payload.pages[0].html_url;
        extra.wiki_page = payload.pages[0].page_name;
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

      if(meta.status) {
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
    if (payload.ref) {
      var refs = payload.ref.split('/');
      extra.branch_name = refs[3] ? refs[3] : refs[2];
      extra.repo = payload.repository.owner.name + '/' + payload.repository.name;
    }

    return extra;
  }



  var ActivityItemView = TroupeViews.Base.extend({
    tagName: 'li',

    initialize: function(/*options*/) {
      this.setRerenderOnChange();

      var service = this.model.get('meta').service;
      if (service == 'github') {
        var event = this.model.get('meta').event;
        this.template = githubTemplates[event];
      } else {
        this.template = serviceTemplates[service];
      }
    },

    getRenderData: function() {
      var meta    = this.model.get('meta');
      var payload = this.model.get('payload');
      var sent    = this.model.get('sent');

      var core = {
        meta: meta,
        payload: payload,
        sent: sent
      };

      var extra = getExtraRenderData(meta, payload);

      return _.extend(core, extra);
    },

    afterRender: function() {
      issueDecorator.decorate(this);
      mentionDecorator.decorate(this);
    }
  });

  var ItemsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'gtrActivityList'
  });
  cocktail.mixin(ItemsView, TroupeViews.SortableMarionetteView);

  var ActivityView = TroupeViews.Base.extend({
    template: activityStreamTemplate,

    initialize: function(/*options*/) {
      this.data = {};
      this.collectionView = new ItemsView({
         collection: this.collection,
        itemView: ActivityItemView
      });
    },

    afterRender: function() {
      this.$el.find('.events').append(this.collectionView.render().el);
    }
  });

  
  return ActivityView;

});
