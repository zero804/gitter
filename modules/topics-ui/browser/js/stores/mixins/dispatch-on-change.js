export default function dipatchOnChangeMixin(Constructor){

  Constructor.prototype.events = (Constructor.prototype.events || []);
  const events = ['add', 'remove', 'reset', 'sync', 'snapshot'];

  Constructor.prototype.onChange = function(fn, ctx){
    var evts = events.concat(this.events).join(' ');
    this.listenTo(this, evts, fn, ctx);
  }

  Constructor.prototype.removeListeners = function(fn, ctx){
    var evts = events.concat(this.events).join(' ');
    this.stopListening(this, evts, fn, ctx);
  }

  return Constructor;

}
