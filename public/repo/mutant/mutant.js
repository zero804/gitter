!(function(t) {
  'use strict';
  function e(t, e, n) {
    var i, r;
    return function() {
      var a = Date.now();
      i && i + e > a
        ? (clearTimeout(r),
          (r = setTimeout(function() {
            (i = a), t.apply(n);
          }, e)))
        : ((i = a), t.apply(n));
    };
  }
  function n(t, e) {
    return t.bind
      ? t.bind(e)
      : function() {
          var n = Array.prototype.slice.call(arguments);
          t.apply(e, n);
        };
  }
  function i(t, e) {
    t || (t = {});
    for (var n in e) t.hasOwnProperty(n) || (t[n] = e[n]);
    return t;
  }
  function r(t) {
    (this._callback = t),
      (this._onModifications = e(
        function() {
          this._callback([]);
        },
        5,
        this
      ));
  }
  function a(t, e, n) {
    (this.element = t),
      (this.callback = e),
      (this.context = n),
      t.addEventListener('load', this, !1),
      t.addEventListener('error', this, !1);
  }
  function o(t) {
    var e = !(
      1 !== t.nodeType ||
      'IMG' !== t.tagName ||
      t.complete ||
      (t.getAttribute('width') && t.getAttribute('height'))
    );
    return e;
  }
  function s(t, e) {
    return t.dataset ? t.dataset[e] : t.getAttribute('data-' + e);
  }
  function d(t, e, n) {
    return t.dataset ? void (t.dataset[e] = n) : t.setAttribute('data-' + e, n);
  }
  function c(t, e) {
    return t.dataset ? void delete t.dataset[e] : void t.removeAttribute(attrName);
  }
  function l() {
    var t = h.createElement('fakeelement'),
      e = {
        transition: 'transitionend',
        OTransition: 'oTransitionEnd',
        MozTransition: 'transitionend',
        WebkitTransition: 'webkitTransitionEnd'
      };
    for (var n in e) if (void 0 !== t.style[n]) return e[n];
  }
  function u(t, r, a) {
    function o() {
      try {
        r.apply(d);
      } finally {
        s.takeRecords();
      }
    }
    var s = this;
    a || (a = {}), (s._eventHandlers = {});
    var d = a.scope || null,
      c = a.timeout || 0;
    s._transitionInterval = a.timeout || 10;
    var l;
    (l = c ? e(o, c) : o),
      (s._callback = l),
      s._findLoadingImages(t),
      (s._mutationCallback = n(s._mutationCallback, s)),
      (s.observer = new v(s._mutationCallback));
    var u = i(a.observers, {
      attributes: !1,
      childList: !0,
      characterData: !1,
      subtree: !0,
      attributeOldValue: !1,
      characterDataOldValue: !1
    });
    s.observer.observe(t, u),
      a.transitions &&
        ((s._transitionEndHandler = {
          target: t,
          handleEvent: function(t) {
            s.endTransition(t.target), l();
          }
        }),
        t.addEventListener(_, s._transitionEndHandler, !1));
  }
  (r.prototype = {
    observe: function(t) {
      (this._target = t), t.addEventListener('DOMSubtreeModified', this._onModifications, !1);
    },
    disconnect: function() {
      this._target &&
        (this._target.removeEventListener('DOMSubtreeModified', this._onModifications, !1),
        delete this._target);
    },
    takeRecords: function() {
      var t = this._target;
      this._target &&
        (t.removeEventListener('DOMSubtreeModified', this._onModifications, !1),
        t.addEventListener('DOMSubtreeModified', this._onModifications, !1));
    }
  }),
    (a.prototype = {
      _detach: function() {
        this.element &&
          (this.element.removeEventListener('load', this, !1),
          this.element.removeEventListener('error', this, !1),
          (this.element = null),
          (this.callback = null),
          (this.context = null));
      },
      handleEvent: function(t) {
        this.callback.call(this.context, t, this);
      }
    });
  var h = t.document,
    v = t.MutationObserver || t.MozMutationObserver || t.WebKitMutationObserver || r,
    f = 0,
    _ = l();
  return (
    (u.prototype = {
      _addListener: function(t) {
        if (!s(t, 'gLoadListenerId')) {
          var e = ++f;
          d(t, 'gLoadListenerId', e),
            (this._eventHandlers[e] = new a(
              t,
              function(t, e) {
                e._detach(), this._callback();
              },
              this
            ));
        }
      },
      _removeListener: function(t) {
        var e = s(t, 'gLoadListenerId');
        if (e) {
          c(t, 'gLoadListenerId');
          var n = this._eventHandlers[e];
          n && (delete this._eventHandlers[e], n._detach());
        }
      },
      _mutationCallback: function(t) {
        var e = this;
        t.forEach(function(t) {
          var n;
          if ('childList' === t.type) {
            if (t.addedNodes)
              for (var i = 0; i < t.addedNodes.length; i++)
                (n = t.addedNodes[i]),
                  1 === n.nodeType &&
                    (n.children.length ? e._findLoadingImages(n) : o(n) && e._addListener(n));
            if (t.removedNodes)
              for (var r = 0; r < t.removedNodes.length; r++)
                (n = t.removedNodes[r]),
                  1 === n.nodeType &&
                    (n.children.length || ('IMG' === n.tagName && e._removeListener(n)));
          }
        }),
          this._callback();
      },
      _findLoadingImages: function(t) {
        for (var e = t.querySelectorAll('img'), n = 0; n < e.length; n++) {
          var i = e[n];
          o(i) && this._addListener(i);
        }
      },
      takeRecords: function() {
        return this.observer.takeRecords();
      },
      startTransition: function(e, n) {
        var i = this,
          r = i._transitions;
        r ? r.push(e) : (i._transitions = r = [e]),
          n &&
            t.setTimeout(function() {
              i.endTransition(e);
            }, n),
          1 !== r.length ||
            i._transitionTimer ||
            (i._transitionTimer = t.setInterval(i._callback, i._transitionInterval));
      },
      endTransition: function(e) {
        var n = this,
          i = n._transitions;
        if (i) {
          for (var r = i.length - 1; r >= 0; r--) i[r] === e && i.splice(r, 1);
          0 === i.length &&
            (delete n._transitions, t.clearTimeout(n._transitionTimer), delete n._transitionTimer);
        }
      },
      disconnect: function() {
        if ((this.observer.disconnect(), this._transitionEndHandler)) {
          var e = this._transitionEndHandler.target;
          e.removeEventListener(_, this._transitionEndHandler, !1);
        }
        t.clearTimeout(self._transitionTimer);
        var n = this._eventHandlers;
        Object.keys(n).forEach(function(t) {
          var e = n[t];
          e && (delete n[t], e._detach());
        });
      }
    }),
    (t.Mutant = u),
    'function' == typeof define &&
      define.amd &&
      define([], function() {
        return u;
      }),
    u
  );
})(window);
