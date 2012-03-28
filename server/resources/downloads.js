var troupeService = require('../services/troupe-service'),
    fileService = require('../services/file-service'),
    mongoose = require("mongoose");

module.exports = {
    index: function(req, res, next) {
      res.send(500);
    },

    new: function(req, res) {
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res) {
      var fileName = '' + req.params.download + (req.params.format ? '.' + req.params.format : '');

      fileService.findByFileName(req.troupe.id, fileName, function(err, file) {
        if (err) return res.send(500);
        if (!file) return res.send(404);

        var db = mongoose.connection.db;
        var GridStore = mongoose.mongo.GridStore;
        var gs = new GridStore(db, file.id, 'r');
        gs.open(function(err, gs) {
          var readStream = gs.stream(true);
          res.contentType(file.mimeType);
          
          readStream.pipe(res);
        });
      });
    },

    edit: function(req, res) {
      res.send(500);
    },

    update: function(req, res) {
      res.send(500);
    },

    destroy: function(req, res) {
      res.send(500);
    }

};
