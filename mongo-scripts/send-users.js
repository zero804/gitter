var options = {
	api_key : 'GAnM1FPIZjemnmUxIWEgNbjN8pQOHVvGCkXrBuGOUfltil3B9S'
};

//create ducksnode object
var ducksnode = require ('../node_modules/ducksnode').create(options);
var mongoose = require ('../node_modules/mongoose'),
	Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/troupe');

var ts = Math.round((new Date()).getTime() / 1000);

var UserSchema = new Schema({
  displayName: { type: String }, 
  email: { type: String },
  confirmationCode: {type: String },
  status: { type: String, "enum": ['UNCONFIRMED', 'PROFILE_NOT_COMPLETED', 'ACTIVE'], "default": 'UNCONFIRMED'},
  passwordHash: { type: String },
  avatarUrlSmall: String,
  avatarUrlMedium: String
});

var Users = mongoose.model('users', UserSchema);

mongoose.connection.on("open", function(){
  console.log("Mongoose connected");
  Users.count({}, function( err, count){
    ducksnode.push ('74845', {value: count, timestamp: ts}, function(err, response_status){
      if (err){
        console.error(err);
      }
      else{
        console.log('OK! Sent Users number: ' + count + ' at ' + ts);
        process.exit(code=0)
      }
    });
  });
});





