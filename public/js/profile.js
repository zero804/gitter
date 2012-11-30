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

