import _ from 'lodash';

//to batch events up
const DELAY_TIME = 8;
const cache = new WeakMap();

const getDelayFromOpt = function(delayOpt, args) {
  let delay = delayOpt;
  if(typeof delayOpt === 'function') {
    delay = delayOpt.apply(this, args);
  }
  if(delay === undefined || delay === null) {
    delay = DELAY_TIME;
  }

  return delay;
}

export default function dipatchOnChangeMixin(Constructor, evts, options) {
  const opts = _.extend({}, { delay: DELAY_TIME }, options);

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
   const delay = getDelayFromOpt(opts.delay);
   let debouncedFn = _.debounce(fn, delay);

    const caller = function() {
      const delay = getDelayFromOpt(opts.delay, arguments);
      if(delay <= 0) {
        fn();
      } else {
        debouncedFn();
      }
    }
    caller.cancel = () => {
      if(debouncedFn.cancel) {
        debouncedFn.cancel();
      }
    }

    //Keep a reference so we can un-bind later
    cache.set(fn, caller);

    this.listenTo(this, evts, caller, ctx);
  }

  Constructor.prototype.removeListeners = function(fn, ctx){

    //Calculate events to unbind
    var evts = events.concat(this.events).join(' ');

    //Get the ACTUAL function we want to unbind out of the cache
    const caller = cache.get(fn);

    //Stop any further calls to the function
    if(caller.cancel) {
      caller.cancel();
    }

    //Unbind dem events, yo.
    this.stopListening(this, evts, caller, ctx);
  }

  return Constructor;

}
