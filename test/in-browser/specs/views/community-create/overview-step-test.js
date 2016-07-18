/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var context = require('utils/context');

var stepConstants = require('public/js/views/community-create/step-constants');
var CommunityCreateModel = require('public/js/views/community-create/community-create-model');
var CommunityCreateStepViewModel = require('public/js/views/community-create/community-create-step-view-model');
var OverviewView = require('public/js/views/community-create/overview-step/community-creation-overview-view');

describe('community-creation-overview-view', function() {

  var communityCreateModel;
  var viewModel;
  var el;
  var view;

  var generateBeforeEachCb = function(newTroupeContext) {
    return function() {
      if(newTroupeContext) {
        context.testOnly.resetTroupeContext(newTroupeContext);
      }

      el = document.createElement('div');
      communityCreateModel = new CommunityCreateModel({
        active: true,
        stepState: stepConstants.INVITE
      });
      viewModel = new CommunityCreateStepViewModel({
        communityCreateModel: communityCreateModel,
        active: true
      });

      view = new OverviewView({
        el: el,
        model: viewModel,
        communityCreateModel: communityCreateModel,
        orgCollection: new Backbone.Collection(),
        repoCollection: new Backbone.Collection()
      });
      view.render();
    }
  };

  beforeEach(generateBeforeEachCb());



  it('should have invited people include users and emails', function() {
    communityCreateModel.peopleToInvite.add([{
      username: 'foo'
    }]);
    communityCreateModel.emailsToInvite.add([{
      emailAddress: 'foo@bar.com'
    }, {
      emailAddress: 'asdf@qwer.com'
    }]);
    assert.strictEqual(view.inviteCollection.length, 3);
  });


  it('should show heading for the current community', function() {
    communityCreateModel.set('communityName', 'foo');
    assert.strictEqual(view.ui.communityNameHeading[0].innerText, 'foo');
  });

});
