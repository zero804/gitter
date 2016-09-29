import Backbone from 'backbone';
import {LiveCollection} from 'gitter-realtime-client';
import {DRAFT} from '../../../shared/constants/model-states';

export default LiveCollection.extend({

  constructor(models = [], attrs = {}){
    this.contextModel = this.getContextModel(attrs);
    attrs.listen = true;
    LiveCollection.prototype.constructor.apply(this, [models, attrs]);
  },

  getContextModel(){
    return new Backbone.Model();
  },

  findModelForOptimisticMerge(){
    const model = this.findWhere({ state: DRAFT });
    return model;
  }

});
