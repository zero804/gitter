"use strict";

var Promise = require('bluebird');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('../../../utils/context');
var apiClient = require('../../../components/apiClient');
var appEvents = require('../../../utils/appevents');
var moment = require('moment');
var Popover = require('../../popover');
var bodyTemplate = require('./tmpl/issuePopover.hbs');
var titleTemplate = require('./tmpl/issuePopoverTitle.hbs');
var footerTemplate = require('./tmpl/commitPopoverFooter.hbs');
var SyncMixin = require('../../../collections/sync-mixin');


function isGitHubUser(user) {
  // Handle Backbone model or pojo
  return user && (user.providers || user.get('providers')).some(function(provider) {
    return provider === 'github';
  });
}

function convertToIssueAnchor(element, githubIssueUrl) {
  var resultantElement = element;
  if(element.tagName !== 'a') {
    var newElement = document.createElement('a');
    newElement.innerHTML = element.innerHTML;
    element.parentNode.replaceChild(newElement, element);

    if (element.hasAttributes()) {
      var attributes = element.attributes;
      for(var i = attributes.length - 1; i >= 0; i--) {
        var attr = attributes[i];
        newElement.setAttribute(attr.name, attr.value);
       }
    }

    newElement.setAttribute('href', githubIssueUrl || '');
    newElement.setAttribute('target', '_blank');

    resultantElement = newElement;
  }

  return resultantElement;
}

function getIssueState(repo, issueNumber) {
  return apiClient.priv.get('/issue-state', {
      r: repo,
      i: issueNumber
    })
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
    getRoomRepo()
      .then(function(roomRepo) {
        var modelRepo = this.model.get('repo');
        var modelNumber = this.model.get('number');
        var mentionText = (modelRepo === roomRepo) ? '#' + modelNumber : modelRepo + '#' + modelNumber;
        appEvents.trigger('input.append', mentionText);
      });

    this.parentPopover.hide();
  }
});

var associatedRepoMemoization = null;

/**
 * Rememoize after room change
 */
context.troupe().on('change:id', function() {
  associatedRepoMemoization = null;
});

function getRoomRepo() {
  var room = context.troupe();
  if(!room) {
    return Promise.reject('No current room');
  }

  if (associatedRepoMemoization) return associatedRepoMemoization;

  var roomId = room.get('id');
  var unlisten;

  // Only runs if the cache misses
  associatedRepoMemoization = new Promise(function(resolve, reject) {
    // Check if the snapshot already came in
    var associatedRepo = room.get('associatedRepo');

    if(associatedRepo || associatedRepo === false) {
      return resolve(associatedRepo || null);
    }

    // Wait for the realtime-troupe-listener snapshot to come in
    function onChange() {
      var updatedRoomId = room.get('id');

      // The room could have changed since the request came back in
      if(roomId !== updatedRoomId) {
        return reject(new Error('Expired'));
      }

      var associatedRepo = room.get('associatedRepo');

      if(associatedRepo || associatedRepo === false) {
        return resolve(associatedRepo || null);
      }
    }

    unlisten = function() {
      room.off('change', onChange);
    }

    room.once('change', onChange);
  })
  .finally(function() {
    if (unlisten) {
      unlisten();
    }
  });

  return associatedRepoMemoization;
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

    var endpoint = '/private/gh/repos/' + repo + '/issues/';

    if(!repo) {
      endpoint = apiClient.room.uri('/issues');
    }

    return endpoint;
  },
  sync: SyncMixin.sync
});



function getAnchorUrl(githubRepo, issueNumber) {
  var currentRoom = context.troupe();
  var currentGroup = context.group();
  var backedBy = currentGroup && currentGroup.get('backedBy');

  if(githubRepo) {
    return 'https://github.com/' + githubRepo + '/issues/' + issueNumber;
  }

  var currentUser = context.user();

  // One-to-ones
  if(!githubRepo && currentRoom.get('oneToOne')) {
    var otherUser = currentRoom.get('user');

    if(currentUser && isGitHubUser(currentUser) && otherUser && isGitHubUser(otherUser)) {
      return 'https://github.com/issues?q=' + issueNumber + '+%28involves%3A' + currentUser.get('username') + '+OR+involves%3A' + otherUser.username + '+%29';
    }
  }

  // We don't know the REPO, but we know the org?
  if(backedBy && backedBy.type === 'GH_ORG') {
    return 'https://github.com/issues?q=' + issueNumber + '+user%3A' + backedBy.linkPath;
  }

  if (currentUser && isGitHubUser(currentUser)) {
    return 'https://github.com/issues?q=' + issueNumber + '+involves:' + currentUser.get('username');
  }

  return 'https://github.com/issues?q=' + issueNumber;
}

function bindAnchorToIssue(view, issueElement, repo, issueNumber, anchorUrl) {
  // Lazy model, will be fetched when it's needed, but not before
  function getModel() {
    var model = new IssueModel({
      repo: repo,
      number: issueNumber,
      html_url: anchorUrl
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

  // Hook up all of the listeners
  issueElement.addEventListener('click', showPopover);
  issueElement.addEventListener('mouseover', showPopoverLater);

  view.once('destroy', function() {
    issueElement.removeEventListener('click', showPopover);
    issueElement.removeEventListener('mouseover', showPopoverLater);
  });
}

var decorator = {
  decorate: function(view) {
    Array.prototype.forEach.call(view.el.querySelectorAll('*[data-link-type="issue"]'), function(issueElement) {
      return Promise.try(function() {
        var repoFromElement = issueElement.dataset.issueRepo;

        if(repoFromElement) {
          return repoFromElement;
        }

        return getRoomRepo();
      })
      .then(function(repo) {
        var issueNumber = issueElement.dataset.issue;
        var anchorUrl = getAnchorUrl(repo, issueNumber) || '';
        issueElement = convertToIssueAnchor(issueElement, anchorUrl);

        if (repo && issueNumber) {
          getIssueState(repo, issueNumber)
            .then(function(state) {
              if(!state) return;

              // We depend on this to style the issue after making sure it is an issue
              issueElement.classList.add('is-existent');

              // dont change the issue state colouring for the activity feed
              if(!issueElement.classList.contains('open') && !issueElement.classList.contains('closed')) {
                issueElement.classList.add(state);
              }

              bindAnchorToIssue(view, issueElement, repo, issueNumber, anchorUrl);
            });
        }

      });
    });
  }
};

module.exports = decorator;
