/*jshint unused:strict, browser:true */
define([
  'underscore'
], function(_) {
  "use strict";

  return {
    /* Index an array into a hash */
    index: function(array, transformer) {
      var result = {};
      for(var i = 0; i < array.length; i++) {
        var item = array[i];
        var key = transformer(item);
        if(result[key]) {
          result[key].push(item);
        } else {
          result[key] = [ item ];
        }
      }

      return result;
    },

    /* Returns a date with no time part */
    extractDateFromDateTime: function(dateTime) {
      if(!dateTime) return null;
      return new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate());
    },

    extractTimeFromDateTime: function(dateTime) {
      if (!dateTime) return null;
      var time = dateTime.getHours() + ":" + dateTime.getMinutes();
      return time;
    },

    formatDate: function(dateTime) {
      if(!dateTime) return "";
      return dateTime.toLocaleDateString();
    }
  };

});
