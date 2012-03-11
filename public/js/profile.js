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
      $("input#displayName").focus();
    },
    
    events: {
      "keydown #password"         : "toggleTooltip",
    },
    
    toggleTooltip: function() {
      clearTimeout(tooltipTimer); 
      tooltipTimer = setTimeout(function() { 
        $('.dp-tooltip').tooltip('hide');
      }, 1000)
    }
   
  });  
  
  return new ProfileView();
      
});
    
