'use strict';

var maxTagLength = 20;

var validateTag = function(tagName, isStaff) {
  var reservedTagTestRegex = (/:/);
  var isValid = true;
  var messageList = [];

  if (!isStaff && reservedTagTestRegex.test(tagName)) {
    messageList.push('Tags can not use `:` colons.');
    isValid = false;
  }
  var tagLength = !!tagName && tagName.length;
  if (!tagLength || tagLength <= 0 || tagLength > maxTagLength) {
    messageList.push('Tags must be between 1 and ' + maxTagLength + ' characters in length.');
    isValid = false;
  }

  return {
    isValid: isValid,
    messages: messageList
  };
};

module.exports = validateTag;
