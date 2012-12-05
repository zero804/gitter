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

    // generate application cache manifest
    manifest:{
      generate: {
        options: {
          basePath: "public/",
          network: ["http://*", "https://*"],
          fallback: ["/ /offline.html"],
          exclude: ["js/jquery.min.js"],
          preferOnline: false,
          timestamp: true
        },
        src: [
            "js/router.js",
            "bootstrap/core-libraries.js",
            "bootstrap/css/*.css"
        ],
        dest: "manifest.appcache"
      }
    },

    requirejs: {
      appDir: "public/",
      baseUrl: "js",
      dir: "public-processed/",
      mainConfigFile: 'public/templates/partials/require_config.hbs',

      modules: [
          {
            name: "core-libraries"
          },
          {
              name: "signup",
              exclude: ["core-libraries"]
          },
          {
              name: "router-core",
              include: [
                "views/widgets/avatar",
                "views/widgets/nav"
              ],
              exclude: ["core-libraries"]
          },
          {
              name: "router",
              include: ["router-core"],
              exclude: ["core-libraries"]
          },
          {
              name: "router-mobile-chat",
              include: ["router-core"],
              exclude: ["core-libraries"]
          },
          {
              name: "router-mobile-file",
              include: ["router-core"],
              exclude: ["core-libraries"]
          },
          /* Views */
          {
              name: "views/chat/chatView",
              exclude: ["core-libraries","router"]
          },
          {
              name: "views/file/fileView",
              exclude: ["core-libraries","router"]
          },
          {
              name: "views/conversation/conversationView",
              exclude: ["core-libraries","router"]
          },
          {
              name: "views/people/peopleView",
              exclude: ["core-libraries","router"]
          }
      ],

      optimize: "none",
      optimizeCss: "none",

      // inlining ftw
      inlineText: true,

      logLevel: 1
    },

    // headless testing through PhantomJS
    mocha: {
      all: ['test/**/*.html']
    },

    // default watch configuration
    watch: {
      less: {
        files: [
          'public/bootstrap/less/**'
        ],
        tasks: 'less'
      }
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

    min: {
      "core-libraries": {
        src: ['public-processed/js/core-libraries.js'],
        dest: 'public-processed/js/core-libraries.js'
      },
      "router-mobile-chat": {
        src: ['public-processed/js/router-mobile-chat.js'],
        dest: 'public-processed/js/router-mobile-chat.js'
      },
      "router": {
        src: ['public-processed/js/router.js'],
        dest: 'public-processed/js/router.js'
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
        src: ['public-processed/js/views/file/chatView.js'],
        dest: 'public-processed/js/views/file/chatView.js'
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
          "public/bootstrap/css/mtrp.css": "public/bootstrap/less/mtrp.less",
          "public/bootstrap/css/trpHomePage.css": "public/bootstrap/less/trpHomePage.less",
          "public/bootstrap/css/trpChat.css": "public/bootstrap/less/trpChat.less",
          "public/bootstrap/css/trpFiles.css": "public/bootstrap/less/trpFiles.less",
          "public/bootstrap/css/trpMails.css": "public/bootstrap/less/trpMails.less",
          "public/bootstrap/css/trpPeople.css": "public/bootstrap/less/trpPeople.less",
          "public/bootstrap/css/trpMobileChat.css": "public/bootstrap/less/trpMobileChat.less",
          "public/bootstrap/css/trpMobileFiles.css": "public/bootstrap/less/trpMobileFiles.less",
          "public/bootstrap/css/trpMobileConversations.css": "public/bootstrap/less/trpMobileConversations.less"

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
        command: 'build-scripts/gzip-processed.sh'
      }
    }

  });

  grunt.loadNpmTasks('grunt-bower');
  grunt.loadNpmTasks('grunt-contrib-manifest');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-clean');

  grunt.registerTask('process', 'clean less copy requirejs min exec:gzip');

};
