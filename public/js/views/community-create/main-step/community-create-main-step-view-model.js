'use strict';

var CommunityCreateStepViewModel = require('../community-create-step-view-model');
var slugAvailabilityStatusConstants = require('../slug-availability-status-constants');
var slugger = require('../../../utils/slugger');

var CommunityCreateMainStepViewModel = CommunityCreateStepViewModel.extend({
  validate: function() {
    var errors = [];

    var communityName = this.communityCreateModel.get('communityName') || '';

    var hasCommunityName = communityName.length > 0;
    if(!hasCommunityName) {
      errors.push({
        key: 'communityName',
        message: 'Please fill in the community name'
      });
    }
    var communitySlug = this.communityCreateModel.get('communitySlug') || '';
    var hasCommunitySlug = communitySlug.length > 0;
    var slugValid = slugger.isValid(communitySlug);
    if(!hasCommunitySlug) {
      errors.push({
        key: 'communitySlug',
        message: 'Please fill in the community slug'
      });
    }
    else if(communitySlug.length < 2 || communitySlug.length > 80) {
      errors.push({
        key: 'communitySlug',
        message: 'Slug length must be 2 to 80 characters'
      });
    }
    else if(!slugValid || this.communityCreateModel.get('communitySlugAvailabilityStatus') === slugAvailabilityStatusConstants.INVALID) {
      errors.push({
        key: 'communitySlug',
        message: 'Slug can only contain lowercase a-z and dashes -'
      });
    }
    else if(this.communityCreateModel.get('communitySlugAvailabilityStatus') === slugAvailabilityStatusConstants.UNAVAILABLE) {
      errors.push({
        key: 'communitySlug',
        message: 'This address is not available'
      });
    }

    return errors.length > 0 ? errors : undefined;
  }
});

module.exports = CommunityCreateMainStepViewModel;
