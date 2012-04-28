require.config({
  paths : {
    jquery: '//ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min',
    jqueryui: '//ajax.googleapis.com/ajax/libs/jqueryui/1.8.18/jquery-ui.min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min',
    bootstrap: '../bootstrap/js/bootstrap.min',
    underscore: 'libs/underscore/underscore-1.3.1-min',
    backbone: 'libs/backbone/backbone-0.9.1-min',
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

      $("#uploadFrame").load(_.bind(this.onUploadFrameLoaded));
    },

    events: {
      "keydown #password"          : "toggleTooltip",
      "click .button-save-picture" : "onSaveProfileImageClicked"
    },

    toggleTooltip: function() {
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(function() {
        $('.dp-tooltip').tooltip('hide'); 
      }, 1000);
    },

    onSaveProfileImageClicked: function() {
      $('#imageModal form').submit();
    },

    onUploadFrameLoaded: function() {
      $('#imageModal').modal('hide');
      $('.image-avatar').attr('src','/avatar?_dc=' + new Date().getTime());
    }

  });

  return new ProfileView();

});

