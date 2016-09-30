import Backbone from 'backbone';
import {LiveCollection} from 'gitter-realtime-client';
import {MODEL_STATE_DRAFT} from '../../../shared/constants/model-states';

export default LiveCollection.extend({

  constructor(models = [], attrs = {}) {
    this.contextModel = this.getContextModel(attrs);
    attrs.listen = true;
    LiveCollection.prototype.constructor.apply(this, [models, attrs]);
  },

  //When we get a model back from the socket we may
  //already have a model in the collection so return that
  //so it can be populated
  findModelForOptimisticMerge(){
    const model = this.findWhere({ state: MODEL_STATE_DRAFT });
    if(!model.id) { return model; }
  },

  getContextModel() {
    return new Backbone.Model();
  },

  toPOJO(options) {
    return this.map(function(model) { return model.toPOJO(options); });
  }

});
