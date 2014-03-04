/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'backbone',
  'utils/appevents',
  'views/popover',
  'hbs!./tmpl/commitPopover',
  'hbs!./tmpl/commitPopoverTitle',
  'hbs!./tmpl/commitPopoverFooter'
], function($, Backbone, appEvents, Popover, template, titleTemplate, footerTemplate) {
  "use strict";

  var MAX_PATH_LENGTH = 40;

  var BodyView = Backbone.View.extend({
    className: 'commit-popover-body',
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      var data = this.model.toJSON();

      // dont bother rendering an empty model
      if(Object.keys(data).length === 0) return this;

      data.date = moment(data.commit.author.date).format("LLL");

      data.files.forEach(function(file) {
        if(file.filename.length > MAX_PATH_LENGTH) {
          file.fullFilename = file.filename;
          file.filename = getShortPath(file.filename);
        }
      });

      if(data.files.length === 1) {
        data.isFileLengthSingular = true;
        if(data.files[0].patch_html) {
          data.firstPatchHtml = data.files[0].patch_html;
        }
      }

      if(data.stats.additions === 1) {
        data.isAdditionsSingular = true;
      }

      if(data.stats.deletions === 1) {
        data.isDeletionsSingular = true;
      }

      this.$el.html(template(data));
      return this;
    }
  });

  var TitleView = Backbone.View.extend({
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      var data = this.model.toJSON();

      // dont bother rendering an empty model
      if(Object.keys(data).length === 0) return this;

      this.$el.html(titleTemplate(data));
      return this;
    }
  });

  var FooterView = Backbone.View.extend({
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
    },
    events: {
      'click button.mention': 'onMentionClick'
    },
    render: function() {
      var data = this.model.toJSON();

      // dont bother rendering an empty model
      if(Object.keys(data).length === 0) return this;

      this.$el.html(footerTemplate(data));
      return this;
    },
    onMentionClick: function() {
      var text = this.model.get('repo')+'@'+this.model.get('sha').substring(0,7);
      appEvents.trigger('input.append', text);
      this.parentPopover.hide();
    }
  });

  function plaintextify($el) {
    $el.replaceWith($el.text());
  }

  function getShortPath(pathString) {
    // if you have one long filename
    if(pathString.split('/').length === 1) {
      return pathString.substring(0, MAX_PATH_LENGTH-1)+'…';
    }

    var shortPath = pathString;

    // remove parents until short enough: a/b/c/d.ext -> …/c/d.ext
    while(shortPath.length > MAX_PATH_LENGTH-2) {
      var parts = shortPath.split('/');
      // cant remove any more parents
      if(parts.length === 1) {
        parts[0] = parts[0].substring(0, MAX_PATH_LENGTH-3)+'…';
      } else {
        parts.shift();
      }
      shortPath = parts.join('/');
    }
    return '…/'+shortPath;
  }

  function preparePopover($commit, repo, sha1) {
    var url = '/api/private/gh/repos/'+repo+'/commits/'+sha1+'?renderPatchIfSingle=true';
    $commit.on('mouseover', function(e) {

      var commitModel = new Backbone.Model();
      $.get(url, function(commit) {
        commitModel.set(commit);
        commitModel.set('repo', repo);
      }).fail(function(error) {
        if(error.status === 404) {
          plaintextify($commit);
        }
      });

      Popover.hoverTimeout(e, function() {
        var pop = new Popover({
          titleView: new TitleView({model: commitModel}),
          view: new BodyView({model: commitModel}),
          footerView: new FooterView({model: commitModel}),
          targetElement: $commit[0],
          placement: 'horizontal'
        });
        pop.show();

      });
    });
  }

  var decorator = {

    decorate: function(chatItemView) {
      chatItemView.$el.find('*[data-link-type="commit"]').each(function() {
        var $commit = $(this);

        var sha1 = this.dataset.commitSha1;
        var repo = this.dataset.commitRepo;

        if(!repo || !sha1) {
          // this aint no commit I ever saw
          plaintextify($commit);
        } else {
          preparePopover($commit, repo, sha1);
        }
      });

    }

  };

  return decorator;

});
