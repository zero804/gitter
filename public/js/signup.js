require([
  'jquery',
  'utils/context',
  'hbs!./map-message',
  'utils/tracking' // no ref
 ],
  function($, context, mapMessageTemplate) {
    "use strict";

    function random(a) {return a[Math.floor(Math.random() * a.length)]; }

    $('#arrow-1').click(function() {
      if (window.mixpanel) window.mixpanel.track('arrow-click', { arrow: 'arrow-1' });
    });

    $('#arrow-2').click(function() {
      if (window.mixpanel) window.mixpanel.track('arrow-click', { arrow: 'arrow-2' });
    });
    
    var featuredRooms  = [
      { uri: 'marionettejs/backbone.marionette',
        name: 'Marionette',
        language: 'JavaScript',
        locale: 'en'
      },
      { uri: 'LaravelRUS/chat',
        name: 'LaravelRUS',
        channel: true,
        language: 'PHP',
        locale: 'ru'
      },
      { uri: 'gitterHQ/nodejs',
        name: '#nodejs',
        channel: true,
        language: 'JavaScript',
        locale: 'en'
      },
      { uri: 'lotus/chat',
        name: 'Lotus',
        channel: true,
        language: 'Ruby',
        locale: 'en'
      },
      { uri: 'rom-rb/chat',
        name: 'rom-rb',
        channel: true,
        language: 'Ruby',
        locale: 'en'
      },
      { uri: 'webpack/webpack',
        name: 'WebPack',
        language: 'JavaScript',
        locale: 'en'
      },
      { uri: 'ruby-vietnam/chat',
        name: 'Ruby Vietnam',
        channel: true,
        language: 'Ruby',
        locale: 'vi'
      },
      { uri: 'require-lx/group',
        name: "require('lx')",
        language: 'JavaScript',
        locale: 'en'
      },
      { uri: 'angular-ui/ng-grid',
        name: 'Angular UI',
        language: 'JavaScript',
        locale: 'en'
      },
      { uri: 'opscode/supermarket',
        name: 'Supermarket',
        language: 'Ruby',
        locale: 'en'
      },
      { uri: 'MahApps/MahApps.Metro',
        name:'MahApps.Metro',
        language: 'PowerShell',
        locale: 'en'
      },
      { uri: 'sympy/sympy',
        name: 'Sympy',
        language: 'Python',
        locale: 'en'
      },
      { uri: 'rogeriopvl/erebot',
        name: 'erebot',
        language: 'JavaScript',
        locale: 'es'
      }
    ];

    var active = [];
 
    // TODO: malditogeek comment
    function roomByLocale(locale) {
      var rooms = featuredRooms.filter(function(r) { return r.locale === locale;});
      if (rooms.length) {
        active.push(rooms[0].name);
        return rooms[0];
      } else {
        return randomRoom();
      } 
    }

    // TODO: malditogeek comment
    function randomRoom() {
      var room = random(featuredRooms);
      if (active.indexOf(room.name) === -1) {
        active.push(room.name);
        return room;
      } else {
        return randomRoom();
      }
    }

    function initEmbedPanel() {
      var rooms = [
        { name: 'GitterHQ', uri: 'gitterHQ/gitter', language: "Let's talk about Gitter!" },
        roomByLocale(context.lang()),
        randomRoom(),
        randomRoom()
      ];

      var tabs = $('.communities-tabs a');

      tabs.each(function() {
        var $this = $(this);
        var tabIndex = $this.data().tabIndex;

        var room = rooms[tabIndex];
        var owner = room.uri.split('/')[0];

        $this.html(
          '<img src="https://avatars.githubusercontent.com/' + owner + '?s=48" width="48" height="48">' +
          '<h3>' + room.name + '</h3>' +
          '<em>' + room.language + '</em>');
      });

      tabs.on('click', function() {
        var $this = $(this);
        var tabIndex = $this.data().tabIndex;

        tabs.removeClass('active');
        $this.addClass('active');
        $('#embedded-chat').attr({src: '/' + rooms[tabIndex].uri + '/~embed'});
      });
    }

    function initAppsPanelScrollListener() {
      var $panel =  $('#apps-panel');
      var $window = $(window);
      var OFFSET = 150;

      $window.on('scroll', function(e) {
        e.preventDefault();

        var panelDistance = $panel.position().top;
        if($window.scrollTop() + OFFSET >= panelDistance) {
          $panel.addClass('visible');
          $window.off('scroll');
        }
      });
    }

    function initMapMessages() {
      //  Make sure we don't randomly generate people in the ocean
      var coords = [
        [64, 113], [150, 142], [194, 222], [345, 221], [275, 70],
        [340, 95], [490, 141], [531, 206], [579, 268], [345, 104],
        [532, 21], [218, 48], [384, 226], [153, 226], [420, 157]
      ];

      var $map = $('.map');

      $.get('/api/private/sample-chats', function(messages) {

        setInterval(function() {
          var chatMessage = messages.shift();
          var pos = coords.shift();

          if(!chatMessage || !pos) return;

          var $el = createMessageBubble(chatMessage, pos);
          addMessageBubbleToMap($el, $map);

          setTimeout(function() {
            coords.push(pos);
            messages.push(chatMessage);
            removeMessageBubbleFromMap($el);
          }, 5000);

        }, 2500);
      });
    }

    function createMessageBubble(chatMessage, pos) {
      var html = mapMessageTemplate({
        username: chatMessage.username,
        avatarUrl: chatMessage.avatarUrl,
        fullRoomName: chatMessage.room,
        roomName: chatMessage.room.split('/').pop(),
        left: pos[0],
        top: pos[1]
      });

      return $(html);
    }

    function addMessageBubbleToMap($message, $map) {
      $message.appendTo($map);

      var $span = $message.find('span');
      $span.css('left', (400 - $span.outerWidth()) / 2);

      $message.children('img').load(function() {
        $message.children().addClass('enter');
      });
    }

    function removeMessageBubbleFromMap($message) {
      $message.children().removeClass('enter').animate({opacity: 0}, function() {
        $message.remove();
      });
    }

    function cycleElements($els, time) {
      $els.first().addClass('visible');
      $els.parent().css('height', $els.outerHeight());

      setInterval(function () {
        var active = $els.filter('.visible').removeClass('visible').addClass('going');
        var target = active.next();

        if(!target.length) {
          target = $els.first();
        }

        target.removeClass('going').addClass('visible');
      }, time);
    }

    /**
     *  Gitter() hadnles front-page client-side stuff
     *  inside the scope of Gitter we have a window argument which is simply
     */
    var Gitter = function (window) {
      // initialises all the things
      this.init = function() {
        initEmbedPanel();
        initAppsPanelScrollListener();
        initMapMessages();
        cycleElements($('#testimonials-panel blockquote'), 7000);
        cycleElements($('.loves li'), 2500);

        $('.tooltip-container').on('mouseout', function() {
          $(this).addClass('out');
          setTimeout(function () { $(this).removeClass('out'); }, 400);
        }).on('mouseover', function () {
          $(this).removeClass('out');
        });
      };
      
      // initialise
      window.ready(this.init.bind(this));
    };
         
    
    new Gitter($(window));
});
