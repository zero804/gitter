define([
  'underscore'
], function(_) {

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

    formatDate: function(dateTime) {
      if(!dateTime) return "";
      return dateTime.toLocaleDateString();
    }
  };

});