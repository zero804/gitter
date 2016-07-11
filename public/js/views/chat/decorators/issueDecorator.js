"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var appEvents = require('utils/appevents');
var moment = require('moment');
var Popover = require('views/popover');
var bodyTemplate = require('./tmpl/issuePopover.hbs');
var titleTemplate = require('./tmpl/issuePopoverTitle.hbs');
var footerTemplate = require('./tmpl/commitPopoverFooter.hbs');
var SyncMixin = require('collections/sync-mixin');


var convertToIssueAnchor = function(element, githubIssueUrl) {
  var resultantElement = element;
  if(element.tagName !== 'a') {
    var newElement = document.createElement('a');
    newElement.innerHTML = element.innerHTML;
    element.parentNode.replaceChild(newElement, element);

    var attrNamedNodeMap = element.attributes;
    Object.keys(attrNamedNodeMap).forEach(function(index) {
      var attr = attrNamedNodeMap[index];
      newElement.setAttribute(attr.nodeName, attr.nodeValue);
    });

    newElement.setAttribute('href', githubIssueUrl);
    newElement.setAttribute('target', '_blank');

    resultantElement = newElement;
  }

  return resultantElement;
};



function getIssueState(repo, issueNumber) {
  var issue = repo + '/' + issueNumber;
  return apiClient.priv.get('/issue-state', { q: issue })
    .then(function(states) {
      return states[0];
    });
}

var BodyView = Marionette.ItemView.extend({
  className: 'issue-popover-body',
  template: bodyTemplate,
  modelEvents: {
    change: 'render'
  },
  serializeData: function() {
    var data = this.model.toJSON();
    data.date = moment(data.created_at).format('LLL');
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
  var backend = room.get('backend');
  if (!backend || backend.type !== 'GH_REPO') return;

  return backend.linkPath;
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

var IssueModel = Backbone.Model.extend({
  idAttribute: 'number',
  urlRoot: function() {
    var repo = this.get('repo');
    return '/private/gh/repos/' + repo + '/issues/';
  },
  sync: SyncMixin.sync
});


function getGitHubIssueUrl(repo, issueNumber) {
  return 'https://github.com/' + repo + '/issues/' + issueNumber;
}

var decorator = {
  decorate: function(view) {
    var roomRepo = getRoomRepo();

    Array.prototype.forEach.call(view.el.querySelectorAll('*[data-link-type="issue"]'), function(issueElement) {
      var repo = issueElement.dataset.issueRepo || roomRepo;
      var issueNumber = issueElement.dataset.issue;
      var githubIssueUrl = getGitHubIssueUrl(repo, issueNumber);

      issueElement = convertToIssueAnchor(issueElement, githubIssueUrl);

      getIssueState(repo, issueNumber)
        .then(function(state) {
          if(state) {
            // We depend on this to style the issue after making sure it is an issue
            issueElement.classList.add('is-existent');

            // dont change the issue state colouring for the activity feed
            if(!issueElement.classList.contains('open') && !issueElement.classList.contains('closed')) {
              issueElement.classList.add(state);
            }

            // Hook up all of the listeners
            issueElement.addEventListener('click', showPopover);
            issueElement.addEventListener('mouseover', showPopoverLater);

            view.once('destroy', function() {
              issueElement.removeEventListener('click', showPopover);
              issueElement.removeEventListener('mouseover', showPopoverLater);
            });
          }
        });

      function getModel() {
        var model = new IssueModel({
          repo: repo,
          number: issueNumber,
          html_url: githubIssueUrl
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

        e.preventDefault();
      }

      function showPopoverLater(e) {
        var model = getModel();

        Popover.hoverTimeout(e, function() {
          showPopover(e, model);
        });
      }
    });
  }
};

module.exports = decorator;
