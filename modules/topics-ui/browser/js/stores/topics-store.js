import { Model, Collection } from 'backbone';

var TopicModel = Model.extend({
  defaults: {}
});

export default Collection.extend({

  model: TopicModel,

  getTopics() {
    return this.models.map(model => model.toJSON());
  },

  getById(id){
    return this.get(id).toJSON();
  }

});
