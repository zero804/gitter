var express = require('express'),
	Resource = require('express-resource');

var app = express.createServer(express.logger());

app.use(express.static(__dirname + '/public'));

app.get('/troupenameavailable', function(request, response) {
  
  if(request.query.troupeName == 'andy') {
    response.send(false);  
  } else {
    response.send(true);
  }

});

app.resource('api/projects', 
{
  index: function(req, res){
    res.send('forum index');
  },

  new: function(req, res){
    res.send('new forum');
  },

  create: function(req, res){
    res.send('create forum');
  },

  show: function(req, res){
    res.send(req.project);
  },

  edit: function(req, res){
    res.send('edit forum ' + req.forum.title);
  },

  update:  function(req, res){
    res.send('update forum ' + req.forum.title);
  },

  destroy: function(req, res){
    res.send('destroy forum ' + req.forum.title);
  },

  load: function(id, fn){
    process.nextTick(function(){
      fn(null, { id: id, title: 'Ferrets' });
    });
  }
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
