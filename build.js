({
    appDir: "public/",
    baseUrl: "js",
    dir: "public-processed/",

    //baseUrl: "public/js/",
    //name: "signup",
    //out: "public/js/signup-min.js",
    //dir: "public-processed/js/",

    modules: [
        {
            name: "signup",
            exclude: ["jquery"]
        },
        {
            name: "app",
            exclude: ["jquery"],
            include: [
                "views/widgets/avatar",
                "views/widgets/nav"
            ]
        },
        {
            name: "views/status/statusView",
            exclude: ["jquery", "app"]
        },
        {
            name: "views/conversation/conversationView",
            exclude: ["jquery", "app"]
        },
        {
            name: "views/conversation/conversationDetailView",
            exclude: ["jquery", "app"]
        },
        {
            name: "views/chat/chatView",
            exclude: ["jquery", "app"]
        },
        {
            name: "views/file/fileView",
            exclude: ["jquery", "app"]
        },
        {
            name: "views/people/peopleView",
            exclude: ["jquery", "app"]},
        {
            name: "views/profile/profileView",
            exclude: ["jquery", "app"]
        }
    ],

    //optimize: "uglify",
    optimize: "none",

    //See https://github.com/mishoo/UglifyJS for the possible values.
    uglify: {
        ascii_only: true,
        beautify: false,
        max_line_length: 1000
    },

    //optimizeCss: "standard",
    optimizeCss: "none",

    // inlining ftw
    inlineText: true,

    pragmasOnSave: {
        //removes Handlebars.Parser code (used to compile template strings) set
        //it to `false` if you need to parse template strings even after build
        excludeHbsParser : true
        // kills the entire plugin set once it's built.
        //excludeHbs: true,
        // removes i18n precompiler, handlebars and json2
        //excludeAfterBuild: true
    },

    logLevel: 1,

    paths: {
        /* rjs plugins */
        hbs: 'libs/require/2.0.4/hbs',
        Handlebars: 'libs/handlebars/1.0beta6/handlebars',
        /* core libs */
        underscore: 'libs/underscore/1.3.1/underscore-1.3.1-min',
        'hbs/hbs/underscore': 'libs/underscore/1.3.1/underscore-1.3.1-min',

        jquery: 'empty:',
        jqueryui: 'libs/jquery-ui/1.8.22/jquery-ui-1.8.22.custom.min',
        jquery_validate : 'libs/jquery.validate/1.9/jquery.validate.min',
        jquery_timeago: 'libs/jquery.timeago/0.11.1/jquery.timeago',
        jquery_colorbox: 'libs/jquery.colorbox/1.3.19/jquery.colorbox-min',
        jquery_ocupload: 'libs/jquery.ocupload/1.1.2/jquery.ocupload-1.1.2-mod',
        dateFormat: 'libs/dateFormat/1.2.3/date.format',
        bootstrap: '../bootstrap/js/bootstrap',
        bootstrap_dropdown: '../bootstrap/js/bootstrap-dropdown',
        backbone: 'libs/backbone/0.9.2/backbone',
        rivets: 'libs/rivets/0.2.1/rivets',
        now: 'libs/nowjs/0.8.1/now',
        noty: 'libs/jquery-noty/1.1.1/jquery.noty',
        fileUploader: 'libs/fileUploader/fileuploader',
        templates: '../templates'
    },

    shim: {
        'bootstrap': {
          deps: ['underscore', 'jquery'],
          exports: 'Bootstrap'
        },
        'dateFormat': {
          exports: 'dateFormat'
        },
        'now': {
          exports: 'nowInitialize'
        },
        'noty': {
          deps: ['jquery']
        },
        'jquery_validate':  ['jquery'],
        'jquery_timeago': ['jquery'],
        'jquery_colorbox': ['jquery'],
        'jquery_ocupload': ['jquery'],
        'bootstrap_dropdown': ['jquery'],
        'rivets': {
          deps: [],
          exports: 'rivets'
        }
    },

    hbs : {
      templateExtension : 'hbs',
      // if disableI18n is `true` it won't load locales and the i18n helper
      // won't work as well.
      disableI18n : true
    }
})
