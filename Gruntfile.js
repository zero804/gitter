var MODULES = [
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
      name: "router-nli-app",
      include: [
        "utils/tracking",
        // XXX: why are these commented out?
        // "views/widgets/avatar",
        // "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "router-chat",
      include: [
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "router-nli-chat",
      include: [
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "router-archive-home",
      include: [
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "router-archive-chat",
      include: [
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "userhome",
      include: [
        "utils/tracking",
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "mobile-native-userhome",
      include: [
        "utils/tracking",
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "mobile-native-router",
      include: [
        "utils/tracking",
        "views/widgets/avatar",
        "views/widgets/timeago"
      ],
      exclude: ["core-libraries"]
  },
  {
      name: "mobile-native-chat",
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
      name: "mobile-nli-app",
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
  }
];

var CLOSURE_PATH = 'build-scripts/closure-v20130722';

module.exports = function( grunt ) {
  'use strict';

  var min = !grunt.option('disableMinifiedSource');

  function createClosureConfig(modules) {
    var config = {};

    var closureModule = grunt.option('closureModule');

    modules.forEach(function(module) {
      var name = module.name;

      if(closureModule && closureModule !== name + '.js') return;

      config[module.name] = {
        js: 'public-processed/js/' + name + '.js',
        jsOutputFile: 'public-processed/js/' + name + '.min.js',
        closurePath: CLOSURE_PATH,
        reportFile: 'output/' + name.replace(/\//g, '-') + '.report.txt',
        options: {
          compilation_level: 'SIMPLE_OPTIMIZATIONS',
          language_in: 'ECMASCRIPT5_STRICT',
          create_source_map: 'public-processed/js/' + name + '.min.js.map',
        }
      };

    });

    return config;
  }

  function compileRequireModules(modules) {
    var requireConfig = {};

    modules.forEach(function(module) {

      requireConfig[module.name] = {
        options: {
          optimize: 'none',
          generateSourceMaps: true,
          preserveLicenseComments: false,
          baseUrl: "public/js",
          name: module.name,
          include: module.include,
          exclude: module.exclude,
          mainConfigFile: 'public/templates/partials/require_config.hbs',
          optimizeCss: "none",
          inlineText: true,
          out: 'public-processed/js/' + module.name + '.js',
          pragmasOnSave: {
            //removes Handlebars.Parser code (used to compile template strings) set
            //it to `false` if you need to parse template strings even after build
            //excludeHbsParser : true,
            // kills the entire plugin set once it's built.
            //excludeHbs: true,
            // removes i18n precompiler, handlebars and json2
            //excludeAfterBuild: true
          }
        },
      };
    });

    return requireConfig;
  }

  //
  // Grunt configuration:
  //
  //
  // https://github.com/cowboy/grunt/blob/master/docs/getting_started.md
  //
  grunt.initConfig({
    htmllint: {
      all: ["public/**/*.hbs"]
    },

    requirejs: compileRequireModules(MODULES),
    "closure-compiler": createClosureConfig(MODULES),

    // default watch configuration
    watch: {
      less: {
        files: [
          'public/bootstrap/less/*.less',
          'public/bootstrap/less/bootstrap/*.less'
        ],
        tasks: 'less',
        options: {
          livereload: true
        }
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

    uglify: {
      mangle: {toplevel: true},
      squeeze: {dead_code: false},
      codegen: {quote_keys: true}
    },

    less: {
      production: {
        options: {
          paths: ["public/bootstrap/less"],
          compress: true,
          yuicompress: true
        },
        files: {
          "public/bootstrap/css/trp3.css" : "public/bootstrap/less/trp3.less",
          "public/bootstrap/css/archive.css" : "public/bootstrap/less/archive.less",
          "public/bootstrap/css/mtrp.css": "public/bootstrap/less/mtrp.less",
          "public/bootstrap/css/signup.css": "public/bootstrap/less/signup.less",
          "public/bootstrap/css/trpHomePage.css": "public/bootstrap/less/trpHomePage.less",
          "public/bootstrap/css/trpAppsPage.css": "public/bootstrap/less/trpAppsPage.less",
          "public/bootstrap/css/trpChat.css": "public/bootstrap/less/trpChat.less",
          "public/bootstrap/css/trpFiles.css": "public/bootstrap/less/trpFiles.less",
          "public/bootstrap/css/trpMails.css": "public/bootstrap/less/trpMails.less",
          "public/bootstrap/css/trpPeople.css": "public/bootstrap/less/trpPeople.less",
          "public/bootstrap/css/trpMobileApp.css": "public/bootstrap/less/trpMobileApp.less",
          "public/bootstrap/css/trpMobileUserhome.css": "public/bootstrap/less/trpMobileUserhome.less",
          "public/bootstrap/css/trpNativeChat.css": "public/bootstrap/less/trpNativeChat.less",
          "public/bootstrap/css/trpNativeFiles.css": "public/bootstrap/less/trpNativeFiles.less",
          "public/bootstrap/css/trpNativeConversations.css": "public/bootstrap/less/trpNativeConversations.less",
          "public/bootstrap/css/trpNativePeople.css": "public/bootstrap/less/trpNativePeople.less",
          "public/bootstrap/css/trpNativeAccept.css": "public/bootstrap/less/trpNativeAccept.less",
          "public/bootstrap/css/trpNativeConnect.css": "public/bootstrap/less/trpNativeConnect.less",
          "public/bootstrap/css/trpNativeCreateTroupe.css": "public/bootstrap/less/trpNativeCreateTroupe.less",
          "public/bootstrap/css/trpStart.css": "public/bootstrap/less/trpStart.less",
          "public/bootstrap/css/trpGeneric.css": "public/bootstrap/less/trpGeneric.less",
          "public/bootstrap/css/trpHooks.css": "public/bootstrap/less/trpHooks.less",
          "public/bootstrap/css/gitter-login.css": "public/bootstrap/less/gitter-login.less"
        }
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
      cocktail: {
        files : {
          'output/client-libs/cocktail/cocktail-amd.js': ['output/client-libs/cocktail/Cocktail.js']
        },
        modules: {
        },
        exports: 'Cocktail'
      },
      faye: {
        files : {
          'output/client-libs/faye/faye-browser.js': ['output/client-libs/faye/browser/faye-browser' + (min ? '-min' : '') + '.js']
        },
        modules: {
        },
        exports: 'window.Faye'
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
      'jquery.validation':  {
        files : {
          'output/client-libs/jquery.validation/jquery.validate-amd.js': ['output/client-libs/jquery.validation/jquery.validate.js']
        },
        modules: {
          'jquery': 'jQuery'
        },
        exports: 'jQuery'
      },
      'jquery-carousel': {
        files : {
          'output/client-libs/jquery-carousel/jquery.carouFredSel-6.2.1.amd.js': ['output/client-libs/jquery-carousel/jquery.carouFredSel-6.2.1.js']
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

      'zeroclipboard': {
        files : {
          'output/client-libs/zeroclipboard/zeroclipboard-amd.js': ['output/client-libs/zeroclipboard/zeroclipboard.js']
        },
        modules: {
        },
        exports: 'window.ZeroClipboard'
      }


    },

    retire: {
      js: ['server/**/*.js'], /** Which js-files to scan. **/
      node: ['.'], /** Which node directories to scan (containing package.json). **/
      options: {
         jsRepository: 'https://raw.github.com/bekk/retire.js/master/repository/jsrepository.json',
         nodeRepository: 'https://raw.github.com/bekk/retire.js/master/repository/npmrepository.json'
      }
    }

  });

  /* using matchdep to load all grunt related modules */
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.registerTask('process', ['less', 'requirejs', 'closure-compiler']);
  grunt.registerTask('process-no-min', ['less', 'requirejs']);
  grunt.registerTask('client-libs', ['bowerRequireWrapper']);

};
