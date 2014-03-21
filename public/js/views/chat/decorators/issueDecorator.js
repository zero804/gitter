/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
  'views/popover',
  'hbs!./tmpl/issuePopover',
  'hbs!./tmpl/issuePopoverTitle',
  'hbs!./tmpl/commitPopoverFooter'
], function($, Backbone, context, appEvents, Popover, bodyTemplate, titleTemplate, footerTemplate) {
  "use strict";

  var BodyView = Backbone.View.extend({
    className: 'issue-popover-body',
    render: function() {
      this.$el.html(bodyTemplate(this.model.attributes));
      return this;
    }
  });

  var TitleView = Backbone.View.extend({
    render: function() {
      this.$el.html(titleTemplate(this.model.attributes));
      return this;
    }
  });

  var FooterView = Backbone.View.extend({
    className: 'commit-popover-footer',
    events: {
      'click button.mention': 'onMentionClick'
    },
    render: function() {
      this.$el.html(footerTemplate(this.model.attributes));
      return this;
    },
    onMentionClick: function() {
      var roomRepo = getRoomRepo();
      var modelRepo = this.model.get('repo');
      var modelNumber = this.model.get('number');
      var mentionText = (modelRepo === roomRepo) ? '#'+modelNumber : modelRepo+'#'+modelNumber;
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

  function plaintextify($el) {
    $el.replaceWith($el.text());
  }

  function createPopover(model, targetElement) {
    return new Popover({
      titleView: new TitleView({model: model}),
      view: new BodyView({model: model}),
      footerView: new FooterView({model: model}),
      targetElement: targetElement,
      placement: 'horizontal'
    });
  }

  var decorator = {

    decorate: function(view) {
      var roomRepo = getRoomRepo();

      view.$el.find('*[data-link-type="issue"]').each(function() {
        var $issue = $(this);

        var repo = $issue.data('issueRepo') || roomRepo;
        var issueNumber = $issue.data('issue');

        if(!repo || !issueNumber) {
          // this aint no issue I ever saw
          plaintextify($issue);
          return;
        }

        var url = '/api/private/gh/repos/'+repo+'/issues/'+issueNumber+'?renderMarkdown=true';

        $.get(url, function(issue) {

          function showPopover(e) {
            var popover = createPopover(model, e.target);
            popover.show();
            Popover.singleton(view, popover);
          }

          function showPopoverLater(e) {
            Popover.hoverTimeout(e, function() {
              var popover = createPopover(model, e.target);
              popover.show();
              Popover.singleton(view, popover);
            });
          }

          // dont change the issue state colouring for the activity feed
          if(!$issue.hasClass('open') && !$issue.hasClass('closed')) {
            $issue.addClass(issue.state);
          }

          var model = new Backbone.Model(issue);
          model.set('date', moment(issue.created_at).format("LLL"));
          model.set('repo', repo);

          $issue.on('click', showPopover);
          $issue.on('mouseover', showPopoverLater);

          view.addCleanup(function() {
            $issue.off('click', showPopover);
            $issue.off('mouseover', showPopoverLater);
          });

        }).fail(function(error) {
          if(error.status === 404) {
            plaintextify($issue);
          }
        });
      });
    }
  };

  return decorator;

});
