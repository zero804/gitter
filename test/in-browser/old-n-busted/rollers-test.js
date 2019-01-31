/*jshint unused:true, browser:true*/
define(['jquery', 'utils/rollers'], function($, Rollers) {
  // to ensure that our test environment is working properly
  describe('Rollers', function() {
    before(function() {
      $(document.body).append("<div id='rollers' style='height:300px; overflow-y: scroll'></div>");
    });

    after(function() {
      $('rollers').remove();
    });

    it('should handle the situation of more than a single page of content arrives at once', function(done) {
      var rollers = new Rollers(document.querySelector('#rollers'));

      var scrollPane = $('#rollers');
      var element;
      for (var i = 0; i < 40; i++) {
        scrollPane.append('<p>Hello' + i + '</p>');
        if (i == 10) {
          element = $('#rollers p').last()[0];
          rollers.trackUntil(element);
        }
      }

      setTimeout(function() {
        var scrollTop = $('#rollers').scrollTop();
        var expectedTop = element.offsetTop - scrollPane[0].offsetTop;
        assert(scrollTop >= expectedTop - 5);
        assert(scrollTop <= expectedTop + 5);
        done();
      }, 100);
    });
  });
});
