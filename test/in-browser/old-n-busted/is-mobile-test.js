/*jshint unused:true, browser:true*/
define(['utils/is-mobile', 'assert'], function(isMobile, assert) {
  describe('is-mobile', function() {
    it('detects iPhone is mobile', function() {
      var userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B141 Safari/8536.25';
      assert(isMobile(userAgent));
    });

    it('detects iPad is mobile', function() {
      var userAgent =
        'Mozilla/5.0 (iPad; CPU OS 6_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B141 Safari/8536.25';
      assert(isMobile(userAgent));
    });

    it('detects anthing android is mobile', function() {
      var userAgent =
        'Mozilla/5.0 (Linux; U; Android 2.3.4; en-us; T-Mobile myTouch 3G Slide Build/GRI40) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';
      assert(isMobile(userAgent));
    });

    it('detects desktop chrome is not mobile', function() {
      var userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.143 Safari/537.36';
      assert(!isMobile(userAgent));
    });

    it('detects native ios client is mobile', function() {
      var userAgent =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 7_1 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) Mobile/11D167 GitterBeta/1.2.2 (4478960544)';
      assert(isMobile(userAgent));
    });

    it('detects native osx client is not mobile', function() {
      var userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.77.4 (KHTML, like Gecko) Gitter/1.153';
      assert(!isMobile(userAgent));
    });

    it('assumes garbage user-agent is not mobile', function() {
      var userAgent = 'nonsense';
      assert(!isMobile(userAgent));
    });
  });
});
