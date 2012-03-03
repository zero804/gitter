require.config({
  paths : {
    jquery : 'libs/jquery/jquery-min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min',
    bootstrap: '../bootstrap/js/bootstrap.min',
    underscore: 'libs/underscore/underscore-1.3.1-min',
    backbone: 'libs/backbone/backbone-0.9.1-min'
  },
  priority : [ 'jquery' ]
});

require(
    [ 'underscore', 'backbone', 'jquery', 'jquery_validate', 'bootstrap' ],
function(_, Backbone, $, v, Bootstrap) {
  var tooltipTimer = null;
  
  var ProfileView = Backbone.View.extend({
    el:   $("#page"),
    
    initialize: function (args) {
      $('.dp-tooltip').tooltip();
    },
    
    events: {
      //"click .check"              : "toggleDone",
      "dblclick div.todo-text"    : "edit",
      "click span.todo-destroy"   : "clear",
      "click .getstarted"         : "proceedToApp",
      "keydown #password"         : "toggleTooltip"
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
    },
    
    toggleTooltip: function() {
      console.log(arguments);
      clearTimeout(tooltipTimer); 
      tooltipTimer = setTimeout(function() { 
        $('.dp-tooltip').tooltip('hide');
      }, 1000)
    }
   
  });  
  
  return new ProfileView();
      
});
    
