var options = {
	api_key : 'GAnM1FPIZjemnmUxIWEgNbjN8pQOHVvGCkXrBuGOUfltil3B9S'
};

//create ducksnode object
var ducksnode = require ('../node_modules/ducksnode').create(options);
var mongoose = require ('../node_modules/mongoose'),
	Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/troupe');

var ts = Math.round((new Date()).getTime() / 1000);

var TroupeSchema = new Schema({
  name: { type: String },
  uri: { type: String }
});

var Troupes = mongoose.model('troupes', TroupeSchema);

mongoose.connection.on("open", function(){
  console.log("Mongoose connected");
  Troupes.count({}, function( err, count){
    ducksnode.push ('74814', {value: count, timestamp: ts}, function(err, response_status){
      if (err){
        console.error(err);
      }
      else{
        console.log('OK! Sent Troupes number: ' + count + ' at ' + ts);
        process.exit(0);
      }
    });
  });
});





