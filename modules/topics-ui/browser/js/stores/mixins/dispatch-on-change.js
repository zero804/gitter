import _ from 'lodash';

//Half a frame seems like a decent enough time
//to batch events up
const DELAY_TIME = 8;
const cache = new WeakMap();

export default function dipatchOnChangeMixin(Constructor, evts) {

  //Default events to bind to
  const events = ['add', 'remove', 'reset', 'sync', 'snapshot'].concat(evts);

  //Grab the events specified on the constructor ie:

  //  const Collection = LiveCollection.extend({
  //    events: [ 'change:body', 'change:title ]
  //  });

  Constructor.prototype.events = (Constructor.prototype.events || []);

  Constructor.prototype.onChange = function(fn, ctx){

    //Events to trigger on
    const evts = events.concat(this.events).join(' ');

    //Get a delayed callback. Backbone can throw out a LOT of events
    //ie snapshot which will trigger changes for every attribute on every model
    //in the WHOLE collection
    const delayedCaller = _.debounce(fn, DELAY_TIME);

    //Keep a reference so we can un-bind later
    cache.set(fn, delayedCaller);

    this.listenTo(this, evts, delayedCaller, ctx);
  }

  Constructor.prototype.removeListeners = function(fn, ctx){

    //Calculate events to unbind
    var evts = events.concat(this.events).join(' ');

    //Get the ACTUAL function we want to unbind out of the cache
    const delayedCaller = cache.get(fn);

    //Unbind dem events, yo.
    this.stopListening(this, evts, delayedCaller, ctx);
  }

  return Constructor;

}
