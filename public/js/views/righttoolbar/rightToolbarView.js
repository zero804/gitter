/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'marionette',
  'views/base',
  'utils/context',
  // 'fineuploader',
  'hbs!./tmpl/rightToolbar',
  'collections/instances/integrated-items',
  'collections/instances/troupes',
  'views/people/peopleCollectionView',
  'cocktail',
  'utils/uservoice',
  'views/widgets/troupeAvatar',
  './repoInfo'
], function($, Backbone, Marionette, TroupeViews, context, /*qq,*/ rightToolbarTemplate, itemCollections,
   trpCollections, PeopleCollectionView, cocktail, userVoice, TroupeAvatar, repoInfo) {
  "use strict";

  var RightToolbarLayout = Marionette.Layout.extend({
    tagName: "span",
    template: rightToolbarTemplate,

    regions: {
      people: "#people-roster",
      troupeAvatar: "#troupe-avatar-region",
      repo_info: "#repo-info"
    },

    initialize: function() {
      this.model = new Backbone.Model({
        troupeEmailAddress: context().troupeUri + '@' + context.env('baseServer'),
        isOneToOne: context.getTroupe().oneToOne
      });

      var self = this;

      trpCollections.troupes.on('change:name', function(model) {
        if (model.id == context.getTroupeId()) {
          self.updateHeader(model.get('name'));
        }
      });

      this.updateHeader(context.getTroupe().name);


    },

    updateHeader: function(value) {
      // header title
      $('#people-header').text(value);
    },

    serializeData: function() {
      var user = context.getUser();
      var troupe = context.getTroupe();
      return {
        headerTitle: troupe && troupe.name || user.displayName,
        isTroupe: !!troupe,
        oneToOne: context.inOneToOneTroupeContext(),
        troupeEmailAddress: context().troupeUri + '@' + context.env('baseServer'),
        user: user,
        favourite: troupe && troupe.favourite,
        troupeAvatarUrl: troupe && troupe.avatarUrl,
        troupeName: troupe && troupe.name,
        troupe: troupe
      };

    },

    onRender: function() {

      $('#toolbar-frame').show();
      $('#right-panel').show();

      userVoice.install(this.$el.find('#help-button'), context.getUser());
      // this.uploader = new qq.FineUploader({
      //   element: this.$el.find('#fineUploader')[0],
      //   dragAndDrop: {
      //     extraDropzones: [$('body')[0]],
      //     hideDropzones: false,
      //     disableDefaultDropzone: false
      //   },
      //   text: {
      //     dragZone: '', // text to display
      //     dropProcessing: '',
      //     waitingForResponse: '',
      //     uploadButton: ''
      //   },
      //   request: {
      //     endpoint: '/api/v1/troupes/' + context.getTroupeId() + '/downloads/'
      //   },
      //   showMessage: function(message) {
      //     if(message === 'No files to upload.') return;
      //     window.alert(message);
      //   },
      //   callbacks: {
      //     onComplete: function(id, fileName, response) {
      //       var model;

      //       if(response.success) {
      //         fileCollection.add(response.file, { merge: true });

      //         model = fileCollection.get(response.file.id);
      //         model.on('change', onChange);
      //       }

      //       function onChange() {
      //         var versions = model.get('versions');
      //         var hasThumb = versions.at(versions.length - 1).get('thumbnailStatus') !== 'GENERATING';
      //         if (hasThumb) {
      //           model.off('change', onChange);
      //         }
      //       }
      //     }
      //   }
      // });

      //this.sidebar.show();

      // reference collections
      var userCollection = itemCollections.users;

      // File View
      // this.files.show(new FileView({ collection: fileCollection }));

      if (!context.inOneToOneTroupeContext()) {
        this.troupeAvatar.show(new TroupeAvatar({
          troupe: context.troupe(),
          noHref: true,
          noUnread: true,
          tooltipPlacement: 'left'
        }));
      }

      // People View
      this.people.show(new PeopleCollectionView({ collection: userCollection }));

      // Repo info
      if (context().troupe.githubType === 'REPO') {
        var repo = new repoInfo.model();
        repo.fetch({data: $.param({repo: context().troupeUri})});
        this.repo_info.show(new repoInfo.view({model: repo}));
      }
    },

  });
  cocktail.mixin(RightToolbarLayout, TroupeViews.DelayedShowLayoutMixin);

  return RightToolbarLayout;

});
