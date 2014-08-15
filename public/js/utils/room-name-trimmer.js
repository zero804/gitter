define([], function () {
  
  "use strict";
  
  var trim = function (name, maxLength) {
    maxLength = (typeof maxLength !== 'undefined') ? maxLength : 25 ; // defaults to 25
    
    if (name.length < maxLength) return name; // avoid computing
    
    var parts = name.split('/'); // break it down
    
    for (var i = 1; i < parts.length; i++) {
      var sub = parts.slice(i).join('/');
      if (sub.length <= maxLength) return sub; // trying to compose a smaller part that makes sense
    }

    // if all else fails, return the first part only
    return parts.pop();
  };
  
  return trim;
});
