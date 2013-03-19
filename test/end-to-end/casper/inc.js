var baseUrl = casper.cli.get('url') || "http://localhost:5000/";
casper.baseUrl = baseUrl;

casper.onError = function() {
  test.fail('Error');
};

casper.on('error', function(e) {
    casper.echo('Fail!' + e);
});

casper.on('http.status.500', function(resource) {
  casper.test.fail('500 on ' + resource.url);
});

