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
      name: "homepage",
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
      name: "router-embed-chat",
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

var LESS_ROOTS = [
  { name: "mobile-login",           only: 'mobile' },
  { name: "signup"                             },
  { name: "trpAppsPage"                        },
  { name: "generic-layout"                     },
  { name: "trpHooks"                           },
  { name: "gitter-login"                       },

  // Bootscript root less files
  { name: 'homepage'                           },
  { name: 'router-chat'                        },
  { name: 'router-app'                         },
  { name: 'router-nli-app'                     },
  { name: 'router-nli-chat'                    },
  { name: 'router-embed-chat'                  },
  { name: 'mobile-app',             only: 'mobile' },
  { name: 'mobile-nli-app',         only: 'mobile' },
  { name: 'router-archive-home'                },
  { name: 'router-archive-chat'                },
  { name: 'userhome'                           },
  { name: 'mobile-userhome',        only: 'mobile' },
  { name: 'mobile-native-chat',     only: 'ios'    },
  { name: 'mobile-native-userhome', only: 'ios'    },


];

var LESS_MAP = LESS_ROOTS.reduce(function(memo, file) {
  var css = 'public/styles/' + file.name + '.css';
  memo[css] = 'public/less/' + file.name + '.less';
  return memo;
}, {});

var MOBILE_ONLY_CSS = LESS_ROOTS.filter(function(file) {
  return file.only == 'mobile';
}).map(function(file) {
  return 'public/styles/' + file.name + '.css';
});

var IOS_ONLY_CSS = LESS_ROOTS.filter(function(file) {
  return file.only == 'ios';
}).map(function(file) {
  return 'public/styles/' + file.name + '.css';
});

var WEB_CSS = LESS_ROOTS.filter(function(file) {
  return !file.only;
}).map(function(file) {
  return 'public/styles/' + file.name + '.css';
});

// Unfortunately we can't upgrade to the latest closure
// as it won't let you mix strict and unstrict code
var CLOSURE_PATH = 'build-scripts/closure-v20130722';

module.exports = function( grunt ) {
  'use strict';

  var min = !grunt.option('disableMinifiedSource');

  function createClosureConfig(modules) {
    var config = {};

    var selectedModule = grunt.option('module');

    modules.forEach(function(module) {
      var name = module.name;

      if(selectedModule && selectedModule !== name + '.js') return;

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

  function createUglifyConfig(modules) {
    var c = {};

    var selectedModule = grunt.option('module');

    modules.forEach(function(module) {
      var name = module.name;

      if(selectedModule && selectedModule !== name + '.js') return;

      var files = {};

      files['public-processed/js/' + name + '.min.js'] =  ['public-processed/js/' + name + '.js'];

      c[name] = {
        options: {
          // sourceMap: true,
          // sourceMapIncludeSources: true,
          // sourceMapIn: 'example/coffeescript-sourcemap.js', // input sourcemap from a previous compilation
        },
        files: files
      };
    });

    return c;
  }

  function appendSourceMapping(modules) {

    var config = {};

    var selectedModule = grunt.option('module');

    modules.forEach(function(module) {
      var name = module.name;

      if(selectedModule && selectedModule !== name + '.js') return;
      var files = {};
      files["public-processed/js/" + name + ".min.js"] = name + ".js.map";
      config[module.name] = {
        files: files
      };

    });

    return config;

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
    "uglify": createUglifyConfig(MODULES),
    "closure-compiler": createClosureConfig(MODULES),
    "append-sourcemapping": appendSourceMapping(MODULES),

    jsonlint: {
      config: {
        src: grunt.file.expand('config/**/*.json')
      }
    },

    htmlmin: {                                     // Task
      dist: {                                      // Target
        options: {                                 // Target options
          removeComments: true,
          collapseWhitespace: true,
          minifyJS: true,
          minifyCSS: true
        },
        files: grunt.file.expandMapping('templates/**/*.hbs', 'public-processed', { cwd: 'public'})
      }
    },

    // default watch configuration
    watch: {
      less: {
        files: [
          'public/js/**/*.less',
          'public/less/**/*.less',
          'public/less/bootstrap/*.less'
        ],
        tasks: ['less:dev','autoprefixer'],
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


    less: {
      production: {
        options: {
          compress: true,
          yuicompress: true
        },
        files: LESS_MAP
      },
      dev: {
        options: {
          compress: false
        },
        files: LESS_MAP
      }
    },

    autoprefixer: {
      web: {
        browsers: [
          'last 4 Safari versions',
          'last 4 Firefox versions',
          'last 4 Chrome versions',
          'IE >= 10'],
        expand: true,
        flatten: true,
        src: WEB_CSS,
        dest: 'public/styles/'
      },
      mobile: {
        browsers: [
          'last 4 ios_saf versions',
          'last 4 and_chr versions',
          'last 4 and_ff versions',
          'last 2 ie_mob versions'],
        expand: true,
        flatten: true,
        src: MOBILE_ONLY_CSS,
        dest: 'public/styles/'
      },
      ios: {
        browsers: ['ios_saf >= 6'],
        expand: true,
        flatten: true,
        src: IOS_ONLY_CSS,
        dest: 'public/styles/'
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

  grunt.registerTask('css', ['less:production', 'autoprefixer']);
  grunt.registerTask('process', ['jsonlint', 'css', 'requirejs', 'closure-compiler']);
  grunt.registerTask('manglejs', ['uglify']);
  grunt.registerTask('process-no-min', ['less', 'requirejs']);
  grunt.registerTask('client-libs', ['bowerRequireWrapper']);

};
