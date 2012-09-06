var options = {
	api_key : 'GAnM1FPIZjemnmUxIWEgNbjN8pQOHVvGCkXrBuGOUfltil3B9S'
};

//create ducksnode object
var ducksnode = require ('../node_modules/ducksnode').create(options);
var diskspace = require('diskspace');

var disk = process.argv.splice(2);

console.log("Disk: " + disk);

var ts = Math.round((new Date()).getTime() / 1000);


diskspace.check(disk, function (total, free, status)
{
  var space;
  space = free/total;
  space = space.toFixed(2);
  console.log("Space: " + space);
  ducksnode.push ('75024', {value: space, timestamp: ts}, function(err, response_status){
    if (err){
      console.error(err);
    }
    else{
      console.log('OK! Sent system disk space: ' + space + ' at ' + ts);
      process.exit(code=0);
    }
  });
});









