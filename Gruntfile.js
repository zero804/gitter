
module.exports = function( grunt ) {
  'use strict';

  var min = !grunt.option('disableMinifiedSource');

  function createClosureConfig(name) {
    return {
      js: 'public-processed/js/' + name + '.js',
      jsOutputFile: 'public-processed/js/' + name + '.min.js',
      closurePath: 'build-scripts/closure-v20130722',
      reportFile: 'output/' + name.replace(/\//g, '-') + '.report.txt',
      options: {
        //compilation_level: 'ADVANCED_OPTIMIZATIONS',
        //compilation_level: 'WHITESPACE_ONLY',
        compilation_level: 'SIMPLE_OPTIMIZATIONS',
        language_in: 'ECMASCRIPT5_STRICT',
        create_source_map: 'public-processed/js/' + name + '.min.js.map',
//        define: [
//        '"DEBUG=false"',
//        '"UI_DELAY=500"'
//        ],
      }
    };
  }

  //
  // Grunt configuration:
  //
  // https://github.com/cowboy/grunt/blob/master/docs/getting_started.md
  //
  grunt.initConfig({
    htmllint: {
      all: ["public/**/*.hbs"]
    },

  requirejs: {
      compile: {
        options: {

          //optimize: 'uglify2',
          optimize: 'none',
          //generateSourceMaps: true,
          preserveLicenseComments: true,
          //useSourceUrl: true,

          appDir: "public/",
          baseUrl: "js",
          dir: "public-processed/",
          mainConfigFile: 'public/templates/partials/require_config.hbs',
          optimizeCss: "none",
          inlineText: true,
          pragmasOnSave: {
              //removes Handlebars.Parser code (used to compile template strings) set
              //it to `false` if you need to parse template strings even after build
              //excludeHbsParser : true,
              // kills the entire plugin set once it's built.
              //excludeHbs: true,
              // removes i18n precompiler, handlebars and json2
              //excludeAfterBuild: true
          },
          modules: [
              {
                name: "core-libraries",
                include: [
                  "../repo/requirejs/requirejs"
                ]
              },
              {
                  name: "signup",
                  exclude: ["core-libraries"]
              },
              {
                  name: "router-app",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "router-homepage",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "homepage-mobile",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "routers/mobile/native/chat-router",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "mobile-app",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "mobile-userhome",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "routers/mobile/native/files-router",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "routers/mobile/native/conversations-router",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "routers/mobile/native/people-router",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "router-login",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar"
                  ],
                  exclude: ["core-libraries"]
              },
               {
                  name: "complete-profile",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "login",
                  exclude: ["core-libraries"]
             }
          ]

        }
      }
    },

    'closure-compiler': {
      'core-libraries': {
            js: 'public-processed/js/core-libraries.js',
            jsOutputFile: 'public-processed/js/core-libraries.min.js',
            closurePath: 'build-scripts/closure-v20130722',
            reportFile: 'output/core-libraries.report.txt',
            options: {
              //compilation_level: 'WHITESPACE_ONLY',
              compilation_level: 'SIMPLE_OPTIMIZATIONS',
              language_in: 'ECMASCRIPT3',
              create_source_map: 'public-processed/js/core-libraries.min.js.map',
            }
          },
      'signup': createClosureConfig('signup'),
      'router-app': createClosureConfig('router-app'),
      "router-homepage": createClosureConfig('router-homepage'),
      "native-chat-router": createClosureConfig('routers/mobile/native/chat-router'),
      "mobile-app-router": createClosureConfig('routers/mobile/web/mobile-app-router'),
      "native-files-router": createClosureConfig('routers/mobile/native/files-router'),
      "native-conversations-router": createClosureConfig('routers/mobile/native/conversations-router'),
      "native-people-router": createClosureConfig('routers/mobile/native/people-router'),
      "router-login": createClosureConfig('router-login'),
      "complete-profile": createClosureConfig('complete-profile'),
      "login": createClosureConfig('login')
    },

    // headless testing through PhantomJS
    mocha: {
      all: ['test/**/*.html']
    },

    reload: {
      port: 35729, // LR default
      liveReload: true
    },

    // default watch configuration
    watch: {
      reload: {
        files: [
          'public/js/**/*.js',
          'public/**/*.hbs',
          'public/bootstrap/css/*.css'
        ],
        tasks: 'reload'
      } //,
      //less: {
       // files: [
        //  'public/**/*.less'
        //],
        //tasks: 'less'
      //}
    },

    // default lint configuration, change this to match your setup:
    // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md#lint-built-in-task
    lint: {
      files: [
        'public/js/collections/**/*.js',
        'public/js/utils/**/*.js',
        'public/js/views/**/*.js'
      ]
    },

    // specifying JSHint options and globals
    // https://github.com/cowboy/grunt/blob/master/docs/task_lint.md#specifying-jshint-options-and-globals
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      },
      globals: {
        jQuery: true
      }
    },

    uglify: {
      mangle: {toplevel: true},
      squeeze: {dead_code: false},
      codegen: {quote_keys: true}
    },

    less: {
      production: {
        options: {
          paths: ["public/bootstrap/less"],
          yuicompress: true
        },
        files: {
          "public/bootstrap/css/trp3.css" : "public/bootstrap/less/trp3.less",
          "public/bootstrap/css/mtrp.css": "public/bootstrap/less/mtrp.less",
          "public/bootstrap/css/signup.css": "public/bootstrap/less/signup.less",
          "public/bootstrap/css/trpHomePage.css": "public/bootstrap/less/trpHomePage.less",
          "public/bootstrap/css/homepage-mobile.css": "public/bootstrap/less/homepage-mobile.less",
          "public/bootstrap/css/trpChat.css": "public/bootstrap/less/trpChat.less",
          "public/bootstrap/css/trpFiles.css": "public/bootstrap/less/trpFiles.less",
          "public/bootstrap/css/trpMails.css": "public/bootstrap/less/trpMails.less",
          "public/bootstrap/css/trpPeople.css": "public/bootstrap/less/trpPeople.less",
          "public/bootstrap/css/trpMobileApp.css": "public/bootstrap/less/trpMobileApp.less",
          "public/bootstrap/css/trpMobileChat.css": "public/bootstrap/less/trpMobileChat.less",
          "public/bootstrap/css/trpMobileFiles.css": "public/bootstrap/less/trpMobileFiles.less",
          "public/bootstrap/css/trpMobileConversations.css": "public/bootstrap/less/trpMobileConversations.less",
          "public/bootstrap/css/trpMobilePeople.css": "public/bootstrap/less/trpMobilePeople.less"

        }
      }
    },

    concat: {
      options: {
        separator: '\n'
      },
      fineuploader: {
        src: ['output/client-libs/fine-uploader/client/js/header.js',
                'output/client-libs/fine-uploader/client/js/util.js',
                'output/client-libs/fine-uploader/client/js/features.js',
                'output/client-libs/fine-uploader/client/js/promise.js',
                'output/client-libs/fine-uploader/client/js/button.js',
                'output/client-libs/fine-uploader/client/js/paste.js',
                'output/client-libs/fine-uploader/client/js/uploader.basic.js',
                "output/client-libs/fine-uploader/client/js/dnd.js",
                "output/client-libs/fine-uploader/client/js/uploader.js",
                "output/client-libs/fine-uploader/client/js/ajax.requester.js",
                "output/client-libs/fine-uploader/client/js/deletefile.ajax.requester.js",
                "output/client-libs/fine-uploader/client/js/window.receive.message.js",
                "output/client-libs/fine-uploader/client/js/handler.base.js",
                "output/client-libs/fine-uploader/client/js/handler.form.js",
                "output/client-libs/fine-uploader/client/js/handler.xhr.js"],
        dest: 'output/client-libs/fine-uploader/fine-uploader.js-raw'
      }
    },
    wrap: {
      faye: {
        src: 'output/client-libs/faye/browser/faye-browser' + (min ? '-min' : '') + '.js',
        dest: 'output/js-temp/',
        wrapper: ['var Faye = function(){\n', '\n return Faye; }.call(window);']
      }
    },

    bowerRequireWrapper: {
      assert: {
        files : {
          'output/client-libs/assert/assert-amd.js': ['output/client-libs/assert/assert.js']
        },
        modules: { },
        exports: 'assert'
      },

      underscore: {
        files : {
          'output/client-libs/underscore/underscore-amd.js': ['output/client-libs/underscore/underscore' + (min ? '-min' : '') + '.js']
        },
        modules: {
        },
        exports: '_'
      },
      backbone: {
        files : {
          'output/client-libs/backbone/backbone-amd.js': ['output/client-libs/backbone/backbone' + (min ? '-min' : '') + '.js']
        },
        modules: {
          'jquery': 'jQuery',
          'underscore': '_'
        },
        exports: 'Backbone'
      },
      fineuploader: {
        files : {
          'output/client-libs/fine-uploader/fine-uploader.js': ['output/client-libs/fine-uploader/fine-uploader.js-raw']
        },
        modules: {
        },
        exports: 'qq'
      },
      faye: {
        files : {
          'output/client-libs/faye/faye-browser.js': ['output/js-temp/output/client-libs/faye/browser/faye-browser' + (min ? '-min' : '') + '.js']
        },
        modules: {
        },
        exports: 'Faye'
      },
      nanoscroller: {
        files : {
          'output/client-libs/nanoscroller/jquery.nanoscroller.js': ['output/client-libs/nanoscroller/bin/javascripts/jquery.nanoscroller' + (min ? '.min' : '') + '.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },
      filteredCollection: {
        files : {
          'output/client-libs/filtered-collection/backbone-filtered-collection-amd.js': ['output/client-libs/filtered-collection/vendor/assets/javascripts/backbone-filtered-collection.js']
        },
        modules: {
          'underscore': '_',
          'backbone': 'Backbone'
        },
        exports: 'Backbone.FilteredCollection'
      },
      'mocha': {
        files : {
          'output/client-libs/mocha/mocha-amd.js': ['output/client-libs/mocha/mocha.js']
        },
        modules: {},
        exports: 'mocha'
      },
      'expect': {
        files : {
          'output/client-libs/expect/expect-amd.js': ['output/client-libs/expect/expect.js']
        },
        modules: {},
        exports: 'expect'
      },
      'jquery-migrate': {
        files : {
          'output/client-libs/jquery/jquery-migrate-amd.js': ['output/client-libs/jquery/jquery-migrate' + (min ? '.min' : '') + '.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },
      'jquery.validation':  {
        files : {
          'output/client-libs/jquery.validation/jquery.validate-amd.js': ['output/client-libs/jquery.validation/jquery.validate.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },
      'jquery-placeholder': {
        files : {
          'output/client-libs/jquery-placeholder/jquery.placeholder-amd.js': ['output/client-libs/jquery-placeholder/jquery.placeholder' + (min ? '.min' : '') + '.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },

      'scrollfix': {
        files : {
          'output/client-libs/scrollfix/scrollfix-amd.js': ['output/client-libs/scrollfix/scrollfix.js']
        },
        modules: {
        },
        exports: 'ScrollFix'
      },

      'bootstrap_tooltip': {
        files : {
          'output/client-libs/bootstrap/bootstrap-tooltip.js': ['output/client-libs/bootstrap/js/bootstrap-tooltip.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },

      'typeahead': {
        files : {
          'output/client-libs/typeahead.js/typeahead.js': ['output/client-libs/typeahead.js/dist/typeahead' + (min ? '.min' : '') + '.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },

      'bootstrap-typeahead': {
        files : {
          'output/client-libs/bootstrap/bootstrap-typeahead.js': ['output/client-libs/bootstrap/js/bootstrap-typeahead.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },

      'zepto': {
        files : {
          'output/client-libs/zepto/zepto-amd.js': ['output/client-libs/zepto/zepto.min.js']
        },
        modules: {

        },
        exports: 'Zepto'
      },

      'zeroclipboard': {
        files : {
          'output/client-libs/zeroclipboard/zeroclipboard-amd.js': ['output/client-libs/zeroclipboard/zeroclipboard.js']
        },
        modules: {
        },
        exports: 'window.ZeroClipboard'
      }


    }
  });

  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-reload');
  grunt.loadNpmTasks('grunt-bower-require-wrapper');
  grunt.loadNpmTasks('grunt-wrap');
  grunt.loadNpmTasks('grunt-closure-compiler');

  grunt.registerTask('process', ['less', 'requirejs', 'closure-compiler']);
  grunt.registerTask('process-no-min', ['less', 'requirejs']);

  grunt.registerTask('watchr', 'reload watch');
  grunt.registerTask('client-libs', ['concat:fineuploader',
                              'wrap:faye',
                              'bowerRequireWrapper'
                              ]);


};
