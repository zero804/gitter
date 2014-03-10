/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
], function() {
  "use strict";

  function getContainer(self) {
    if(self.$itemViewContainer) return self.$itemViewContainer;
    return self.$el;
  }

  return {
    events: {
      'keydown': 'selectKeydown',
      'mouseover li:not(.divider):visible': 'selectMouseOver',
      'click li': 'selectClicked'
    },
    selectMouseOver: function(e) {
      var $c = getContainer(this);
      var $items = $c.find('li:not(.divider):visible');

      if (!$items.length) return;

      var currentActive = $items.filter('.active');
      var newActive = e.currentTarget;

      if(currentActive[0] === newActive) return;

      currentActive.removeClass('active');
      newActive.classList.add("active");
    },

    selectKeydown: function (e) {
      switch(e.keyCode) {
        case 13:
          this.simulateClick();
          return;
        case 38:
          this.selectPrev();
          break;
        case 40:
          this.selectNext();
          break;
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();
    },
    selectPrev: function() {
      this._moveSelect(-1);
    },
    selectNext: function() {
      this._moveSelect(+1);
    },
    simulateClick: function() {
      var $c = getContainer(this);

      var first = $c.find('li:not(.divider):visible.active').first();
      if(first.length) {
        first.trigger('click');
      } else {
        this._moveSelect(0);
        $c.find('li:not(.divider):visible.active').first().trigger('click');
      }
    },
    selectClicked: function(e) {
      var selected = e.currentTarget;
      var cid = selected.dataset.cid;
      var model = this.collection.get(cid);
      this.setSelected(model);

      e.preventDefault();
      e.stopPropagation();
    },
    onAfterItemAdded: function(itemView) {
      if(this.selectedModel && itemView.model.id == this.selectedModel.id) {
        itemView.$el.addClass('selected');
      }
    },
    setSelected: function(model) {
      if(this.selectedModel) {
        this.selectedModel.trigger('unselected');

        var oldSelectedView = this.children.findByModel(this.selectedModel);
        if(oldSelectedView) {
          oldSelectedView.$el.removeClass('selected');
        }
      }

      this.selectedModel = model;

      if(model) {
        model.trigger('selected');
        var selectedView = this.children.findByModel(model);
        selectedView.$el.addClass('selected');
      }
      this.trigger('selected', model);
    },
    _moveSelect: function(delta) {
      var $c = getContainer(this);

      var $items = $c.find('li:not(.divider):visible');

      if (!$items.length) return;

      var currentActive = $items.filter('.active');
      var index = $items.index(currentActive);
      if(!~index) {
        index = 0;
      } else {
        index = index + delta;
        if(index < 0) {
          index = 0;
        } else if(index >= $items.length) {
          index = $items.length - 1;
        }
      }

      if(index != currentActive) {
        var newActive = $items.eq(index);
        currentActive.removeClass('active');
        newActive.addClass('active');
        newActive.addClass('focus');
      }
    }
  };

});
