var Mocha = require('mocha');
var glob = require('glob');
var path = require('path');
var babelRegister = require('babel-register');
var babelConfig = require('../../dev/babel-config');

babelRegister(babelConfig);

var mocha = new Mocha({ useColors: true });


window.onerror = function(message){
  console.error(message);
};

glob.sync(path.resolve(__dirname, '../specs') + '/**/*.js').forEach(function(filePath){
  mocha.addFile(filePath);
});

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
