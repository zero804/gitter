import Backbone from 'backbone';
import * as routeData from './mock-data/route';

var MockRouter = Backbone.Model.extend({});

var router = new MockRouter(routeData);

afterEach(function(){
  router.set(routeData)
})

export default router;
