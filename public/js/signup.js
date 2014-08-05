require([
  'jquery',
  'utils/tracking' // no ref
 ],
  function($) {
    "use strict";

    //function random(a) {return a[Math.floor(Math.random()*a.length)]; }

    $('#arrow-1').click(function() {
      if (window.mixpanel) window.mixpanel.track('arrow-click', { arrow: 'arrow-1' });
    });

    $('#arrow-2').click(function() {
      if (window.mixpanel) window.mixpanel.track('arrow-click', { arrow: 'arrow-2' });
    });

    /**
     *   Main app stuff is in here
     */
    var Gitter = function() {
      /**
       *   Cache the "this" object for when context changes
       */
      var me = this;

      /**
       *   Where do we append our elements?
       */
      this.mapEl = $('.map');
      this.bg = $('#intro-panel > .bg');
      this.apps = $('#apps-panel');

      this.speeds = {
        default: 350,
        fast: 150,
        slow: 800
      };

      /**
       *   What happens when we start up?
       */
      this.init = function() {
        //  Wait until all images have loaded
        $(window).load(this.onLoad);

        //  Start the map conversation thing
        this.map();

        //  Cycle blockquotes
        this.cycle($('#testimonials-panel blockquote'), 7000);
        this.cycle($('.loves li'), 2500);

        $('.team a').attr('target', '_blank');

        $('.tooltip-container').on('mouseout', function() {
          var me = $(this);

          me.addClass('out');
          setTimeout(function() { me.removeClass('out'); }, 400);
        }).on('mouseover', function() {
          $(this).removeClass('out');
        });
      };

      this.cycle = function(el, speed) {
        el.first().addClass('visible');

        el.parent().css('height', el.outerHeight());

        setInterval(function() {
          var active = el.filter('.visible').removeClass('visible').addClass('going');
          var target = active.next();

          if(!target.length) {
            target = el.first();
          }

          target.removeClass('going').addClass('visible');
        }, speed || 4000);
      };

      this.onLoad = function() {
        //  Fade in the background image
        me.bg.fadeIn(me.speeds.slow);//.resizeToParent();

        //  @TODO
        //  Initiate the chat boxes
        //  @TODO

        //  Make the apps panel start on scroll
        me.appsPanel();
      };

      this.appsPanel = function() {
        var pos = me.apps.position().top;
        var win = $(window);
        var offset = 150;

        win.scroll(function() {
          if(win.scrollTop() + offset >= pos) {
            me.apps.addClass('visible');
          }
        });
      };

      /**
       *   Generate pseudo-random conversations
       */
      this.map = function() {
        //  Make sure we don't randomly generate people in the ocean
        var coords = [
          [64, 113], [150, 142], [194, 222], [345, 221], [275, 70],
          [340, 95], [490, 141], [531, 206], [579, 268], [345, 104],
          [532, 21], [218, 48], [384, 226], [153, 226], [420, 157]
        ];
        
        var messages = [];

        //  And have some random messages
        //var messages = ['Hey guys, how’s it going?', 'Hey everyone!', 'Anyone looking at <b>#146</b>?',
        //        'Did anyone see that ludicrous display last night?', '<code>sudo rm -rf /</code>'];

        var generate = function(chatMessage, pos) {
          var msg = $('<div class="msg" />');

          // Add to the map
          //this.appendTo(msg);

          var room = chatMessage.room.split('/').pop();
          var html = "<b>" + chatMessage.username + "</b> in <a href='/" + chatMessage.room + "'>" + room + "</a>";
          var span = $('<span />').html(html).appendTo(msg);

          var img = $('<img />').attr({src: chatMessage.avatarUrl,"class":"avatar"});
          img.appendTo(msg);

          msg.css({
            left: pos[0],
            top: pos[1]
          }).appendTo(me.mapEl);

          span.css('left', (400 - span.outerWidth()) / 2);

          msg.children('img').load(function() {
            msg.children().addClass('enter');
          });

          setTimeout(function() {
            coords.push(pos);
            messages.push(chatMessage);

            msg.children().removeClass('enter').animate({opacity: 0}, function() {
              msg.remove();
            });
          }, 5000);
        };

        $.get('/api/private/sample-chats', function(data) {
          messages = data;
          setInterval(function() {
            var msg = messages.shift();
            var pos = coords.shift();
            if (msg && pos) generate(msg, pos);
          }, 2500);
        });

      };

      //  And go!
      this.init();
    };

    new Gitter({});

});



