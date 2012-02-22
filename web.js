var express = require('express'),
	Resource = require('express-resource'),
	tmpl = require('./server/mustache-template');

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate;

var app = express.createServer(
    express.cookieParser(),
    express.session({ secret: 'all your moo' })
);

app.configure(function() {
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  
  app.set('view engine', 'mustache');
  app.set('view options',{layout:false});  
  app.register(".mustache", tmpl);
});

app.get('/users', function(req, res){
  
});

app.get('/troupenameavailable', function(request, response) {
  
  if(request.query.troupeName == 'andy') {
    response.send(false);  
  } else {
    response.send(true);
  }
});

app.get('/confirm', function(req, res) {
  res.render('confirm', {
    title: 'Users',
    users: []
  });
});


app.post(
    '/signup',

    // Form filter and validation middleware
    form(
      filter("troupeName").trim(),
      validate("troupeName").required().is(/^[a-z]+$/),
      filter("email").trim(),
      validate("email").isEmail()
    ),

    // Express request-handler now receives filtered and validated data
    function(req, res){
      if (!req.form.isValid) {
        // Handle errors
        console.log(req.form.errors);

      } else {
        // Or, use filtered form data from the form object:
        console.log("Username:", req.form.troupeName);
        console.log("Email:", req.form.email);
      }
      
      res.redirect("/confirm");
    }
);

app.resource('api/projects',  require('./server/resources/projects.js'));

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
