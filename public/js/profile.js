require.config({
  paths : {
    jquery : 'libs/jquery/jquery-min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min',
    bootstrap: '../bootstrap/js/bootstrap.min',
    underscore: 'libs/underscore/underscore-1.3.1-min',
    backbone: 'libs/backbone/backbone-0.9.1-min',
    fileuploader: 'libs/fileuploader/fileuploader'
  },
  priority : [ 'jquery' ]
});

require(
    [ 'underscore', 'backbone', 'jquery', 'jquery_validate', 'bootstrap', 'fileuploader' ],
function(_, Backbone, $, v, Bootstrap) {
  var tooltipTimer = null;

  var ProfileView = Backbone.View.extend({
    el:   $("#page"),

    initialize: function (args) {
      $('.dp-tooltip').tooltip();
      $("input#displayName").focus();

      var uploader = new qq.FileUploader({
        element: $('#file-uploader')[0],
        action: '/profile/image',
        sizeLimit: 5 * 1024 * 1024,
        minSizeLimit: 1 * 1024,
        debug: false,
        allowedExtensions: ['jpg','jpeg','png','gif'],
        onSubmit: _.bind(this.onFormSubmit, this),
        onProgress: _.bind(this.onFormUploadProgress, this),
        onComplete: _.bind(this.onFormUploadComplete, this),
        onCancel: _.bind(this.onFormUploadCancel, this),
        showMessage: function(message){  }
      });
    },

    events: {
      "keydown #password"          : "toggleTooltip",
      "click .button-save-picture" : "onSaveProfileImageClicked"
    },

    onFormSubmit: function(id, fileName) {
      console.log("Submit");
      return true;
    },

    onFormUploadProgress: function(id, fileName, loaded, total){
      console.log("Progress");
      return true;
    },

    onFormUploadComplete: function(id, fileName, responseJSON){
      console.log("Complete");
      return true;
    },

    onFormUploadCancel: function(id, fileName){
      console.log("Cancel");
      return true;
    },

    toggleTooltip: function() {
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(function() {
        $('.dp-tooltip').tooltip('hide');
      }, 1000)
    },

    onSaveProfileImageClicked: function() {
      $('#imageModal form').submit();
    }

  });

  return new ProfileView();

});

