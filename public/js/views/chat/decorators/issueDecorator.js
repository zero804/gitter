/* jshint unused:strict, browser:true, strict:true, -W097 */
"use strict";
var Promise = require('bluebird');
var $ = require('jquery');
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



var changeElementType = function(element, newType) {
  var $element = $(element);

  var attrs = {};
  var attrNamedNodeMap = $element[0].attributes;
  Object.keys(attrNamedNodeMap).forEach(function(index) {
    var attr = attrNamedNodeMap[index];
    attrs[attr.nodeName] = attr.nodeValue;
  });

  var $newElement = $('<' + newType + '/>', attrs).append($element.contents());
  $element.replaceWith($newElement);
  return $newElement;
};


module.exports = (function() {

  var localCache = {};
  function getIssueState(repo, issueNumber) {
    var issue = repo + '/' + issueNumber;
    var localResult = localCache[issue];
    if(localResult) {
      return Promise.resolve(localResult);
    }

    return apiClient.priv.get('/issue-state', { q: issue })
      .then(function(states) {
        localCache[issue] = states[0];
        setTimeout(function() { delete localCache[issue]; }, 60000);
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


  var IssueModel = Backbone.Model.extend({
    idAttribute: "number",
    urlRoot: function() {
      var repo = this.get('repo');
      return '/private/gh/repos/' + repo + '/issues/';
    },
    sync: SyncMixin.sync
  });






  var decorator = {

    decorate: function(view) {
      var roomRepo = getRoomRepo();

      view.$el.find('*[data-link-type="issue"]').each(function() {
        var $issue = $(this);

        var repo = $issue.data('issueRepo') || roomRepo;
        var issueNumber = $issue.data('issue');

        var convertToLink = function() {
          $issue = changeElementType($issue, 'a');
          $issue.attr('href', getModel().get('html_url'));
          $issue.attr('target', '_blank');
        };

        getIssueState(repo, issueNumber)
          .then(function(state) {
            if(state) {
              // We depend on this to style the issue after making sure it is an issue
              $issue.addClass('is-existent');

              // dont change the issue state colouring for the activity feed
              if(!$issue.hasClass('open') && !$issue.hasClass('closed')) {
                $issue.addClass(state);
              }

              // Hook up all of the listeners
              $issue.on('click', showPopover);
              $issue.on('mouseover', showPopoverLater);

              view.once('destroy', function() {
                $issue.off('click', showPopover);
                $issue.off('mouseover', showPopoverLater);
              });
            }
          })
          .catch(function(err) {
            // Only convert to link if we are sure the request was messed up vs
            // a definitive doesn't exist 404
            if(err.status < 400 && err.status > 499) {
              convertToLink();
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

      });
    }
  };

  return decorator;


})();
