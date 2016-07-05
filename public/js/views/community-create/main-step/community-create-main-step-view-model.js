'use strict';

var CommunityCreateStepViewModel = require('../community-create-step-view-model');
var slugAvailabilityStatusConstants = require('../slug-availability-status-constants');

var CommunityCreateMainStepViewModel = CommunityCreateStepViewModel.extend({
  validate: function() {
    var errors = [];

    var hasCommunityName = this.communityCreateModel.get('communityName').length > 0;
    if(!hasCommunityName) {
      errors.push({
        key: 'communityName',
        message: 'Please fill in the community name'
      });
    }
    var communitySlug = this.communityCreateModel.get('communitySlug');
    var hasCommunitySlug = communitySlug.length > 0;
    if(!hasCommunitySlug) {
      errors.push({
        key: 'communitySlug',
        message: 'Please fill in the community slug'
      });
    }
    var slugMatches = communitySlug.match(/[a-z0-9\-]+/);
    if(!slugMatches || slugMatches[0] !== communitySlug) {
      errors.push({
        key: 'communitySlug',
        message: 'Slug can only contain lowercase a-z and dashes -'
      });
    }
    if(this.communityCreateModel.get('communitySlugAvailabilityStatus') !== slugAvailabilityStatusConstants.AVAILABLE) {
      errors.push({
        key: 'communitySlug',
        message: 'Slug is already taken'
      });
    }

    return errors.length > 0 ? errors : undefined;
  }
});

module.exports = CommunityCreateMainStepViewModel;
