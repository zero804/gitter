var Mocha = require('mocha');
var path = require('path');


var mocha = new Mocha();
mocha.addFile(path.resolve(__dirname, './build/test.js'));

// Run the tests.
mocha.run(function(failures){
  process.on('exit', function () {
    process.exit(failures);  // exit with non-zero status if there were failures
  });
});
