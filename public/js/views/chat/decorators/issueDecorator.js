/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'views/popover',
  'hbs!./tmpl/issuePopover',
  'hbs!./tmpl/issuePopoverTitle',
], function($, Backbone, context, Popover, issuePopoverTemplate, issuePopoverTitleTemplate) {
  "use strict";

  var BodyView = Backbone.View.extend({
    className: 'issue-popover-body',
    render: function() {
      this.$el.html(issuePopoverTemplate(this.model.attributes));
      return this;
    }
  });

  var TitleView = Backbone.View.extend({
    render: function() {
      this.$el.html(issuePopoverTitleTemplate(this.model.attributes));
      return this;
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

        var url;
        if(repo.toLowerCase() === roomRepo.toLowerCase()) {
          url = '/api/v1/troupes/'+context.getTroupeId()+'/issues/'+issueNumber+'?renderMarkdown=true';
        } else {
          url = '/api/private/gh/repos/'+repo+'/issues/'+issueNumber+'?renderMarkdown=true';
        }

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
