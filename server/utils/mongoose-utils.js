/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global require: true, module: true */

exports.attachNotificationListenersToSchema = function (schema, listeners) {

  if(listeners.onCreate || listeners.onUpdate) {
    schema.pre('save', function (next) {
      var isNewInstance = this.isNew;

      this.post('save', function(postNext) {
        if(isNewInstance) {
          listeners.onCreate(this, postNext);
        } else {
          listeners.onUpdate(this, postNext);
        }
      });

      next();
    });
  }

  if(listeners.onRemove) {
    schema.post('remove', function(model, numAffected) {
      listeners.onRemove(model, numAffected);
    });
  }

};
