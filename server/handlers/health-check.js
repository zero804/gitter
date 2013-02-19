/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

//TODO: remove
module.exports = {
    install: function(app) {
      app.get('/health-check',
        function(req, res) {
          res.send("OK");
        });
    }
};