import { Model, Collection } from 'backbone';

var TopicModel = Model.extend({
  defaults: {}
});

export default Collection.extend({

  model: TopicModel,

  getTopics: function(){
    return this.models.map(model => model.toJSON());
  }
});
