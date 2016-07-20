var Mocha = require('mocha');
var path = require('path');


var mocha = new Mocha({ useColors: true });
mocha.addFile(path.resolve(__dirname, './build/test.js'));

window.onerror = function(message){
  console.log('-----------------------');
  console.log(message);
  console.log('-----------------------');
};

// Run the tests.
var runner = mocha.run(function(failures){
  process.on('exit', function () {
    process.exit(failures);  // exit with non-zero status if there were failures
  });
});

runner.on('end', function(){
  process.exit();
});

runner.on('fail', function(test, err){
  process.exit(1);
});
