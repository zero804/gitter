require.config({
  paths : {
    jquery : 'libs/jquery/jquery-min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min',
    underscore: 'libs/underscore/underscore-min',
    backbone: 'libs/backbone/backbone-optamd3-min'
  },
  priority : [ 'jquery' ]
});

require(
    [ 'underscore', 'backbone', 'jquery', 'jquery_validate' ],
function(_, Backbone, $, v) {
      
  var ProfileView = Backbone.View.extend({
    el:   $("#page"),
    events: {
      //"click .check"              : "toggleDone",
      "dblclick div.todo-text"    : "edit",
      "click span.todo-destroy"   : "clear",
      "click .getstarted"         : "proceedToApp"
    },
  
    proceedToApp: function() {
      window.location.href = '/app';
      return false;
    },
    
    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },
    
    // Remove the item, destroy the model.
    clear: function() {
      this.model.destroy();
    }
  
  });  
  
  return new ProfileView();
      
});
    
