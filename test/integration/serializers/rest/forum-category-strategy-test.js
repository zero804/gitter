"use strict";

var testRequire = require('../../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assertUtils = require('../../assert-utils')
var serialize = testRequire('./serializers/serialize');
var ForumCategoryStrategy = testRequire('./serializers/rest/forum-category-strategy');


describe('ForumCategoryStrategy', function() {
  var blockTimer = require('../../block-timer');
  before(blockTimer.on);
  after(blockTimer.off);

  var fixture = fixtureLoader.setup({
    forum1: {},
    category1: {
      forum: 'forum1'
    }
  });

  it('should serialize a category', function() {
    var strategy = new ForumCategoryStrategy();
    var category = fixture.category1;
    return serialize([category], strategy)
      .then(function(s) {
        assertUtils.assertSerializedEqual(s, [{
          id: category.id,
          name: category.name,
          slug: category.slug
        }])
      });
  });
});

