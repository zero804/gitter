import Backbone from 'backbone';
import {LiveCollection} from 'gitter-realtime-client';

export default LiveCollection.extend({

  constructor(models = [], attrs = {}){
    this.contextModel = this.getContextModel(attrs);
    attrs.listen = true;
    LiveCollection.prototype.constructor.apply(this, [models, attrs]);
  },

  getContextModel(){
    return new Backbone.Model();
  }

});
