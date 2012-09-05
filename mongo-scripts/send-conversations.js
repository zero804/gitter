var options = {
	api_key : 'GAnM1FPIZjemnmUxIWEgNbjN8pQOHVvGCkXrBuGOUfltil3B9S'
};

//create ducksnode object
var ducksnode = require ('../node_modules/ducksnode').create(options);
var mongoose = require ('../node_modules/mongoose'),
	Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/troupe');

var ts = Math.round((new Date()).getTime() / 1000);

var ConversationSchema = new Schema({
  subject: { type: String }
});

var Conversations = mongoose.model('conversations', ConversationSchema);

mongoose.connection.on("open", function(){
  console.log("Mongoose connected");
  Conversations.count({}, function( err, count){
    ducksnode.push ('74816', {value: count, timestamp: ts}, function(err, response_status){
      if (err){
        console.error(err);
      }
      else{
        console.log('OK! Sent Conversations number: ' + count + ' at ' + ts);
        process.exit(code=0)
      }
    });
  });
});





