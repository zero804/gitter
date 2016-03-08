'use strict';

var $ = require('jquery');


var defaults = {
  pinStateClass: 'is-menu-pinned',
  extraMouseOverElement: null,
  width: 30,
  height: 24,
  deflection: 5,
  strokeWidth: 2
};



var legDefaults = $.extend({}, defaults, {
  offsetY: 0
});

// `t` is a value from 0 to 1 representing the amount of deflection
// `dir` is the direction the arrow is pointing
var getDeflectedLegDescription = function(options, dir, t) {
  var opts = $.extend({}, legDefaults, options);
  var actualDeflection = t * opts.deflection;

  var pathDescription = 'M0,'+opts.offsetY + ' l'+(opts.width/2)+','+ (-1 * dir * actualDeflection) + ' l'+(opts.width/2)+',' + (dir * actualDeflection);

  return pathDescription;
};

// `t` is a value from 0 to 1 representing the amount of deflection
var getFirstLegDescription = function(options, t) {
  var opts = $.extend({}, legDefaults, options);
  var newOpts = $.extend({}, opts, {
    offsetY: opts.offsetY + (opts.deflection + (opts.strokeWidth/2))
  });
  var pathDescription = getDeflectedLegDescription(newOpts, 1, t);

  return pathDescription;
};

var getSecondLegDescription = function(options, t) {
  var opts = $.extend({}, legDefaults, options);
  var pathDescription = 'M0,'+((opts.height/2) + opts.deflection) + ' l'+(opts.width/2)+',0' + ' l'+(opts.width/2)+',0';
  return pathDescription;
};

var getThirdLegDescription = function(options, t) {
  var opts = $.extend({}, legDefaults, options);
  var newOpts = $.extend({}, opts, {
    offsetY: opts.offsetY + ((opts.height + opts.deflection) - (opts.strokeWidth / 2))
  });
  var pathDescription = getDeflectedLegDescription(newOpts, -1, t);

  return pathDescription;
};




var generateMenuToggleButton = function(toggleElement, options) {
  var $toggleElement = $(toggleElement);
  var opts = $.extend({}, defaults, options);


  if($toggleElement.length > 0) {
    // Initialization/Setup
    // ------------------------------------------
    var totalHeight = opts.height + (2 * opts.deflection);
    $toggleElement.attr('width', opts.width + 'px');
    $toggleElement.attr('height', totalHeight + 'px');
    // We have to use `setAttribute` because jQuery's `attr` forces lowercase
    $toggleElement.each(function() {
      this.setAttribute('viewBox', '0 0 ' + opts.width + ' ' + totalHeight);
    });

    var $children = $toggleElement.children();
    if($children.length >= 3) {
      var $firstLeg = $($children.get(0));
      var $secondLeg = $($children.get(1));
      var $thirdLeg = $($children.get(2));

      $firstLeg.attr('d', getFirstLegDescription(opts, 0));
      $secondLeg.attr('d', getSecondLegDescription(opts, 0));
      $thirdLeg.attr('d', getThirdLegDescription(opts, 0));
    }



    // Animation/Interaction
    // ------------------------------------------
    var legDeflectAnimationOptions = {
      duration: 200,
      queue: false,
      step: function(t, fx) {
        if(fx.prop === 'firstT') {
          $firstLeg.attr('d', getFirstLegDescription(opts, fx.now));
        }
        else if(fx.prop === 'thirdT') {
          $thirdLeg.attr('d', getThirdLegDescription(opts, fx.now));
        }
      }
    };

    var deflectArmsBasedOnPinState = function(isPinned) {
      if(isPinned) {
        $firstLeg.animate({
          firstT: 0,
          thirdT: 1
        }, legDeflectAnimationOptions);
      }
      else {
        $firstLeg.animate({
          firstT: 1,
          thirdT: 0
        }, legDeflectAnimationOptions);
      }
    };


    $toggleElement.on('update-toggle-icon-state', function() {
      // We use this because jQuery's `hasClass` doesn't work with SVG
      var isPinned = !!this.classList.contains(opts.pinStateClass);
      deflectArmsBasedOnPinState(isPinned);
    });


    var mouseOverElements = $toggleElement.add(opts.extraMouseOverElement);
    // We could potentially `mouseleave` the element before the extra elements or vice-versa so only unlock
    // once we know the cursor is out of everything
    var mouseOverLockMap = mouseOverElements.toArray().map(function() {
      return false;
    });
    var getMouseOverLock = function() {
      return mouseOverLockMap.reduce(function(prev, val) {
        return prev || val;
      }, false);
    };

    mouseOverElements.each(function(index) {
      $(this).on('mouseenter', function() {
          mouseOverLockMap[index] = true;

          // We use this because jQuery's `hasClass` doesn't work with SVG
          var isPinned = !!$toggleElement[0].classList.contains(opts.pinStateClass);
          deflectArmsBasedOnPinState(isPinned);
        })
        .on('mouseleave', function() {
            mouseOverLockMap[index] = false;

            if(!getMouseOverLock()) {
              $firstLeg.animate({
                firstT: 0,
                thirdT: 0
              }, legDeflectAnimationOptions);
            }
        });
    });
  }
};


module.exports = generateMenuToggleButton;
