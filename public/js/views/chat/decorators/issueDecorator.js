"use strict";
/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
var $ = require('jquery');
var Backbone = require('backbone');
var Marionette = require('marionette');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');
var moment = require('moment');
var Popover = require('views/popover');
var bodyTemplate = require('./tmpl/issuePopover.hbs');
var titleTemplate = require('./tmpl/issuePopoverTitle.hbs');
var footerTemplate = require('./tmpl/commitPopoverFooter.hbs');

module.exports = (function() {


  var BodyView = Marionette.ItemView.extend({
    className: 'issue-popover-body',
    template: bodyTemplate,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.date = moment(data.created_at).format("LLL");
      return data;
    }
  });

  var TitleView = Marionette.ItemView.extend({
    className: 'issue-popover-title',
    modelEvents: {
      change: 'render'
    },
    template: titleTemplate
  });

  var FooterView = Marionette.ItemView.extend({
    className: 'commit-popover-footer',
    template: footerTemplate,
    events: {
      'click button.mention': 'onMentionClick'
    },
    modelEvents: {
      change: 'render'
    },
    onMentionClick: function() {
      var roomRepo = getRoomRepo();
      var modelRepo = this.model.get('repo');
      var modelNumber = this.model.get('number');
      var mentionText = (modelRepo === roomRepo) ? '#' + modelNumber : modelRepo + '#' + modelNumber;
      appEvents.trigger('input.append', mentionText);
      this.parentPopover.hide();
    }
  });

  function getRoomRepo() {
    var room = context.troupe();
    if(room.get('githubType') === 'REPO') {
      return room.get('uri');
    } else {
      return '';
    }
  }

  function createPopover(model, targetElement) {
    return new Popover({
      titleView: new TitleView({ model: model }),
      view: new BodyView({ model: model }),
      footerView: new FooterView({ model: model }),
      targetElement: targetElement,
      placement: 'horizontal'
    });
  }

  var localCache = { };

  function addIssue(repo, issueNumber, callback) {
    var issue = repo + '/' + issueNumber;
    var localResult = localCache[issue];
    if(localResult) {
      setTimeout(function() { callback(localResult); }, 0);
      return;
    }

    apiClient.priv.get('/issue-state', { q: issue })
      .then(function(states) {
        localCache[issue] = states[0];
        setTimeout(function() { delete localCache[issue]; }, 60000);
        callback(states[0]);
      });

  }

  var IssueModel = Backbone.Model.extend({
    idAttribute: "number",
    urlRoot: function() {
      var repo = this.get('repo');
      return '/private/gh/repos/' + repo + '/issues/';
    }
  });

  var decorator = {

    decorate: function(view) {
      var roomRepo = getRoomRepo();

      view.$el.find('*[data-link-type="issue"]').each(function() {
        var $issue = $(this);

        var repo = $issue.data('issueRepo') || roomRepo;
        var issueNumber = $issue.data('issue');

        addIssue(repo, issueNumber, function(state) {
          // dont change the issue state colouring for the activity feed
          if(!$issue.hasClass('open') && !$issue.hasClass('closed')) {
            $issue.addClass(state);
          }
        });

        function getModel() {
          var model = new IssueModel({
            repo: repo,
            number: issueNumber,
            html_url: 'https://github.com/' + repo + '/issues/' + issueNumber
          });

          model.fetch({
            data: { renderMarkdown: true },
            error: function() {
              model.set({ error: true });
            }
          });
          return model;
        }
        function showPopover(e, model) {
          if(!model) model = getModel();

          var popover = createPopover(model, e.target);
          popover.show();
          Popover.singleton(view, popover);
        }

        function showPopoverLater(e) {
          var model = getModel();

          Popover.hoverTimeout(e, function() {
            showPopover(e, model);
          });
        }

        $issue.on('click', showPopover);
        $issue.on('mouseover', showPopoverLater);

        view.once('destroy', function() {
          $issue.off('click', showPopover);
          $issue.off('mouseover', showPopoverLater);
        });
      });
    }
  };

  return decorator;


})();
