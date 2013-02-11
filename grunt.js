
module.exports = function( grunt ) {
  'use strict';

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
                  "libs/require/2.1.4/require-min"
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
          "public/bootstrap/css/trp2.css" : "public/bootstrap/less/trp2.less",
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
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-manifest');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-clean');
  grunt.loadNpmTasks('grunt-reload');

  grunt.registerTask('process', 'clean less copy requirejs exec:manifest exec:gzip');
  grunt.registerTask('process-no-min', 'clean less copy requirejs exec:manifest exec:gzip');

  grunt.registerTask('watchr', 'reload watch');

};
