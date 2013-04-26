
module.exports = function( grunt ) {
  'use strict';

  var min = !grunt.option('disableMinifiedSource');


  //
  // Grunt configuration:
  //
  // https://github.com/cowboy/grunt/blob/master/docs/getting_started.md
  //
  grunt.initConfig({
    clean: {
        folder: "public-processed/"
    },

    htmllint: {
      all: ["public/**/*.hbs"]
    },

  requirejs: {
      compile: {
        options: {

          optimize: 'uglify2',
          generateSourceMaps: true,
          preserveLicenseComments: false,
          useSourceUrl: true,


          appDir: "public/",
          baseUrl: "js",
          dir: "public-processed/",
          mainConfigFile: 'public/templates/partials/require_config.hbs',

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
                  name: "router-core",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "app-integrated",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "router-mobile-chat",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "router-mobile-files",
                  include: [
                    "utils/tracking",
                    "views/widgets/avatar",
                    "views/widgets/timeago"
                  ],
                  exclude: ["core-libraries"]
              },
              {
                  name: "router-mobile-conversations",
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
              }
          ],

          optimizeCss: "none",

          // inlining ftw
          inlineText: true,

          logLevel: 1
        }
      }
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

    min: {
      "core-libraries": {
        src: ['public-processed/js/core-libraries.js'],
        dest: 'public-processed/js/core-libraries.js'
      },
      "app-integrated": {
        src: ['public-processed/js/app-integrated.js'],
        dest: 'public-processed/js/app-integrated.js'
      },
      "router-mobile-chat": {
        src: ['public-processed/js/router-mobile-chat.js'],
        dest: 'public-processed/js/router-mobile-chat.js'
      },
      "router": {
        src: ['public-processed/js/router.js'],
        dest: 'public-processed/js/router.js'
      },
      "router-login": {
        src: ['public-processed/js/router-login.js'],
        dest: 'public-processed/js/router-login.js'
      },
      "signup": {
        src: ['public-processed/js/signup.js'],
        dest: 'public-processed/js/signup.js'
      },
      "chatView": {
        src: ['public-processed/js/views/chat/chatView.js'],
        dest: 'public-processed/js/views/chat/chatView.js'
      },
      "fileView": {
        src: ['public-processed/js/views/file/fileView.js'],
        dest: 'public-processed/js/views/file/fileView.js'
      },
      "conversationView": {
        src: ['public-processed/js/views/conversation/conversationView.js'],
        dest: 'public-processed/js/views/conversation/conversationView.js'
      },
      "peopleView": {
        src: ['public-processed/js/views/people/peopleView.js'],
        dest: 'public-processed/js/views/people/peopleView.js'
      }
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
          "public/bootstrap/css/trpHomePage.css": "public/bootstrap/less/trpHomePage.less",
          "public/bootstrap/css/trpChat.css": "public/bootstrap/less/trpChat.less",
          "public/bootstrap/css/trpFiles.css": "public/bootstrap/less/trpFiles.less",
          "public/bootstrap/css/trpMails.css": "public/bootstrap/less/trpMails.less",
          "public/bootstrap/css/trpPeople.css": "public/bootstrap/less/trpPeople.less",
          "public/bootstrap/css/trpMobileChat.css": "public/bootstrap/less/trpMobileChat.less",
          "public/bootstrap/css/trpMobileFiles.css": "public/bootstrap/less/trpMobileFiles.less",
          "public/bootstrap/css/trpMobileConversations.css": "public/bootstrap/less/trpMobileConversations.less",
          "public/bootstrap/css/trpMobilePeople.css": "public/bootstrap/less/trpMobilePeople.less"

        }
      }
    },

    copy: {
      dist: {
        files: {
          "public-processed/": "public/**"
        }
      }
    },
    exec: {
      gzip: {
        command: './build-scripts/gzip-processed.sh'
      },
      manifest: {
        command: './build-scripts/update-manifest.sh'
      },
      validateConfig: {
        command: './node_modules/.bin/jsonlint config/*.json'
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
          'output/client-libs/filtered-collection/backbone-filtered-collection-amd.js': ['output/client-libs/filtered-collection/backbone-filtered-collection.js']
        },
        modules: {
          'underscore': '_',
          'backbone': 'Backbone'
        },
        exports: 'Backbone.FilteredCollection'
      },
      'mocha': {
        files : {
          'output/client-libs/mocha-amd.js': ['output/client-libs/mocha.js']
        },
        exports: 'mocha'
      },
      'expect': {
        files : {
          'output/client-libs/expect-amd.js': ['output/client-libs/expect.js']
        },
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
      }

    }
  });

  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-reload');
  grunt.loadNpmTasks('grunt-bower-require-wrapper');
  grunt.loadNpmTasks('grunt-wrap');


  grunt.registerTask('process', ['exec:validateConfig','clean','less','copy','requirejs','exec:manifest','exec:gzip']);
  grunt.registerTask('process-no-min', ['exec:validateConfig','clean','less','copy','requirejs','exec:manifest','exec:gzip']);

  grunt.registerTask('watchr', 'reload watch');
  grunt.registerTask('client-libs', ['concat:fineuploader',
                              'wrap:faye',
                              'bowerRequireWrapper'
                              ]);


};
