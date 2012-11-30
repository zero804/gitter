module.exports = function( grunt ) {
  'use strict';

  //
  // Grunt configuration:
  //
  // https://github.com/cowboy/grunt/blob/master/docs/getting_started.md
  //
  grunt.initConfig({

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
            "js/**/*.js",
            "js/*.min.js",
            "css/*.css"
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
              name: "signup",
              exclude: ["jquery"]
          },
          {
              name: "router",
              exclude: ["jquery"]
          },
          {
              name: "router-mobile-chat",
              exclude: ["jquery"]
          }
      ],

      optimize: "none",
      optimizeCss: "none",

      // inlining ftw
      inlineText: true,
      pragmas: {
        doExclude: true
      },
      /*
      pragmasOnSave: {
          //removes Handlebars.Parser code (used to compile template strings) set
          //it to `false` if you need to parse template strings even after build
          excludeHbsParser : true,
          // kills the entire plugin set once it's built.
          excludeHbs: true,
          // removes i18n precompiler, handlebars and json2
          excludeAfterBuild: true
      },
      */
      logLevel: 1
    },

    // headless testing through PhantomJS
    mocha: {
      all: ['test/**/*.html']
    },

    // default watch configuration
    watch: {
      reload: {
        files: [
          'app/*.html',
          'app/styles/**/*.css',
          'app/scripts/**/*.js',
          'app/images/**/*'
        ],
        tasks: 'reload'
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
      dist: {
        src: ['public-processed/js/router-mobile-chat.js'],
        dest: 'public-processed/js/router-mobile-chat.js'
      }
    },

    less: {
      production: {
        options: {
          paths: ["public/bootstrap/less"],
          yuicompress: true
        },
        files: {
          "public/bootstrap/css/trp2.css" : "public-processed/bootstrap/less/trp2.less",
          "public/bootstrap/css/mtrp.css": "public-processed/bootstrap/less/mtrp.less",
          "public/bootstrap/css/trpHomePage.css": "public-processed/bootstrap/less/trpHomePage.less",
          "public/bootstrap/css/trpChat.css": "public-processed/bootstrap/less/trpChat.less",
          "public/bootstrap/css/trpFiles.css": "public-processed/bootstrap/less/trpFiles.less",
          "public/bootstrap/css/trpMails.css": "public-processed/bootstrap/less/trpMails.less",
          "public/bootstrap/css/trpPeople.css": "public-processed/bootstrap/less/trpPeople.less"
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
        command: 'build/gzip-processed.sh'
      }
    }

  });

  grunt.loadNpmTasks('grunt-bower');
  grunt.loadNpmTasks('grunt-contrib-manifest');
  grunt.loadNpmTasks('grunt-requirejs');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-exec');

  grunt.registerTask('process', 'copy less requirejs');

};
