require([
  'jquery',
  'utils/context',
  'utils/tracking' // no ref
 ],
  function($, context) {
    "use strict";

    function random(a) {return a[Math.floor(Math.random()*a.length)]; }

    $('#arrow-1').click(function() {
      if (window.mixpanel) window.mixpanel.track('arrow-click', { arrow: 'arrow-1' });
    });

    $('#arrow-2').click(function() {
      if (window.mixpanel) window.mixpanel.track('arrow-click', { arrow: 'arrow-2' });
    });

    var featuredRooms  = [{
      uri: 'marionettejs/backbone.marionette',
      name: 'Marionette',
      language: 'JavaScript',
      locale: 'en'
    },{
      uri: 'LaravelRUS/chat',
      name: 'LaravelRUS',
      channel: true,
      language: 'PHP',
      locale: 'ru'
    }, {
      uri: 'gitterHQ/nodejs',
      name: '#nodejs',
      chanel: true,
      language: 'JavaScript',
      locale: 'en'
    }, {
      uri: 'lotus/chat',
      name: 'Lotus',
      chanel: true,
      language: 'Ruby',
      locale: 'en'
    },{
      uri: 'rom-rb/chat',
      name: 'rom-rb',
      chanel: true,
      language: 'Ruby',
      locale: 'en'
    }, {
      uri: 'webpack/webpack',
      name: 'WebPack',
      language: 'JavaScript',
      locale: 'en'
    }, {
      uri: 'ruby-vietnam/chat',
      name: 'Ruby Vietnam',
      chanel: true,
      language: 'Ruby',
      locale: 'vi'
    }, {
      uri: 'require-lx/group',
      name: "require('lx')",
      language: 'JavaScript',
      locale: 'en'
    }, {
      uri: 'angular-ui/ng-grid',
      name: 'Angular UI',
      language: 'JavaScript',
      locale: 'en'
    }, {
      uri: 'opscode/supermarket',
      name: 'Supermarket',
      language: 'Ruby',
      locale: 'en'
    }, {
      uri: 'MahApps/MahApps.Metro',
      name:'MahApps.Metro',
      language: 'PowerShell',
      locale: 'en'
    }, {
      uri: 'sympy/sympy',
      name: 'Sympy',
      language: 'Python',
      locale: 'en'
    }, {
      uri: 'rogeriopvl/erebot',
      name: 'erebot',
      language: 'JavaScript',
      locale: 'es'
    }];

    var active = [];
 
    function roomByLocale(locale) {
      var _room;
      featuredRooms.forEach(function(room) {
        if (room.locale === locale) _room = room;
      });
      return _room || randomRoom();
    }

    function randomRoom() {
      var room = random(featuredRooms);
      if (active.indexOf(room.name) === -1) {
        active.push(room.name);
        return room;
      } else {
        return randomRoom();
      }
    }

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
        $(window).ready(this.onLoad);

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

        //  Initiate the chat boxes
        me.embedChats();

        //  Make the apps panel start on scroll
        me.appsPanel();
      };

      this.appsPanel = function() {
        var pos = me.apps.position().top;
        var win = $(window);
        var offset = 150;
        // we need to listen to this only until the class is added
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

        var generate = function(chatMessage, pos) {
          var msg = $('<div class="msg" />');

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

      this.embedChats = function() {
        var navs = $('.communities-tabs a');

        function link(a, room) {
          var owner = room.uri.split('/').shift();

          $(a).html(
            '<img src="https://avatars.githubusercontent.com/' + owner + '?s=48" width="48" height="48">' +
            '<h3>' + room.name + '</h3>' +
            '<em>' + room.language + '</em>');

          $(a).click(function() {
            $('#embedded-chat').attr({src: '/' + room.uri + '/~embed'});
          });
        }

        var a0 = navs[0];
        var room0 = {name: 'GitterHQ', uri: 'gitterHQ/gitter', language: "Let's talk about Gitter!"}
        link(a0, room0);

        var a1 = navs[1];
        var room1 = roomByLocale(context.lang());
        link(a1, room1);

        var a2 = navs[2];
        var room2 = randomRoom();
        link(a2, room2);

        var a3 = navs[3];
        var room3 = randomRoom();
        link(a3, room3);
      };

      //  And go!
      this.init();
    };

    new Gitter({});
});
