var options = {
	api_key : 'GAnM1FPIZjemnmUxIWEgNbjN8pQOHVvGCkXrBuGOUfltil3B9S'
};

//create ducksnode object
var ducksnode = require ('../node_modules/ducksnode').create(options);
var mongoose = require ('../node_modules/mongoose'),
	Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/troupe');

var ts = Math.round((new Date()).getTime() / 1000);

var ChatMessageSchema = new Schema({
  text: String,
  sent: { type: Date, "default": Date.now }
});

var Chats = mongoose.model('chatmessages', ChatMessageSchema);

mongoose.connection.on("open", function(){
  console.log("Mongoose connected");
  Chats.count({}, function( err, count){
    ducksnode.push ('74815', {value: count, timestamp: ts}, function(err, response_status){
      if (err){
        console.error(err);
      }
      else{
        console.log('OK! Sent chat number: ' + count + ' at ' + ts);
        process.exit(code=0)
      }
    });
  });
});





