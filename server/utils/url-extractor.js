/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var TwitterText   =  require('./twitter-text');


/** This is a nasty exponential algo, but should do us well except if people drop thousands of links into a single message */
function overlapWithIndices(urls, begin, end) {
  for(var i = 0; i < urls.length; i++) {
    var urlStart = urls[i].indices[0];
    var urlEnd = urls[i].indices[1];

    // If start or end are within the range, drop them
    if(urlStart >= begin && urlStart <= end) return true;
    if(urlEnd >= begin && urlEnd <= end) return true;

    // Totally inside
    if(urlStart <= begin && urlEnd >= end) return true;
    // Totally outside
    if(urlStart >= begin && urlEnd <= end) return true;

    // Assumption: urls with indices is always in sorted order
    // The list is sorted, no need to go any further
    if(urlStart > end) return false;
  }

  return false;
}

exports.extractUrlsWithIndices = function(text) {
    var urls = TwitterText.extractUrlsWithIndices(text);


    var emailRe = /[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;
    var match;

    while ((match = emailRe.exec(text)) !== null) {
      var email = match[0];
      var start = match.index;
      var end = start + email.length;

      if(!overlapWithIndices(urls, start, end)) {
        urls.push({ url: 'mailto:' + match[0], indices: [ start, end ] });
      }
    }

    return urls;

};

/** For the moment, just pass this on to twitter */
exports.extractMentionsWithIndices = function(text) {
  return TwitterText.extractMentionsWithIndices(text);
};

exports.extractIssuesWithIndices = function(text) {
  return TwitterText.extractHashtagsWithIndices(text)
    .map(function(hashtagObj) {
      return {
        indices: hashtagObj.indices,
        number: hashtagObj.hashtag
      };
    });
};

