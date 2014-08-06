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
      shortName: 'Marionette',
      language: 'JavaScript',
      localeLanguage: 'en'
    },{
      uri: 'LaravelRUS/chat',
      shortName: 'LaravelRUS',
      channel: true,
      language: 'PHP',
      localeLanguage: 'ru'
    }, {
      uri: 'gitterHQ/nodejs',
      shortName: '#nodejs',
      chanel: true,
      language: 'JavaScript',
      localeLanguage: 'en'
    }, {
      uri: 'lotus/chat',
      shortName: 'Lotus',
      chanel: true,
      language: 'Ruby',
      localeLanguage: 'en'
    },{
      uri: 'rom-rb/chat',
      shortName: 'rom-rb',
      chanel: true,
      language: 'Ruby',
      localeLanguage: 'en'
    }, {
      uri: 'webpack/webpack',
      shortName: 'WebPack',
      language: 'JavaScript',
      localeLanguage: 'en'
    }, {
      uri: 'ruby-vietnam/chat',
      shortName: 'Ruby Vietnam',
      chanel: true,
      language: 'Ruby',
      localeLanguage: 'vi'
    }, {
      uri: 'require-lx/group',
      shortName: 'require-lx',
      language: 'JavaScript',
      localeLanguage: 'en'
    }, {
      uri: 'angular-ui/ng-grid',
      shortName: 'Angular UI',
      language: 'JavaScript',
      localeLanguage: 'en'
    }, {
      uri: 'opscode/supermarket',
      shortName: 'Supermarket',
      language: 'Ruby',
      localeLanguage: 'en'
    }, {
      uri: 'MahApps/MahApps.Metro',
      shortName:'MahApps.Metro',
      language: 'PowerShell',
      localeLanguage: 'en'
    }, {
      uri: 'sympy/sympy',
      shortName: 'Sympy',
      language: 'Python',
      localeLanguage: 'en'
    }, {
      uri: 'rogeriopvl/erebot',
      shortName: 'erebot',
      language: 'JavaScript',
      localeLanguage: 'es'
    }];

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

        navs.each(function(i) {
          if (i === 0) {
            $(this).click(function() {
              $('#embedded-chat').attr({src: '/gitterHQ/gitter/~embed'});
            })
            return;
          }

          var room = random(featuredRooms);
          var roomOwner = room.uri.split('/').shift();

          $(this).html(
            '<img src="https://avatars.githubusercontent.com/' + roomOwner + '?s=48" width="48" height="48">' +
            '<h3>' + room.shortName + '</h3>' +
            '<em>' + room.language + '</em>');

          $(this).click(function() {
            $('#embedded-chat').attr({src: '/' + room.uri + '/~embed'});
          })
        });
        
      };

      //  And go!
      this.init();
    };

    new Gitter({});
});



