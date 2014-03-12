define(["jquery"], function (jQuery){

/*
 * jQuery JSONP Core Plugin 2.4.0 (2012-08-21)
 *
 * https://github.com/jaubourg/jquery-jsonp
 *
 * Copyright (c) 2012 Julian Aubourg
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 */
( function( $ ) {

  // ###################### UTILITIES ##

  // Noop
  function noop() {
  }

  // Generic callback
  function genericCallback( data ) {
    lastValue = [ data ];
  }

  // Call if defined
  function callIfDefined( method , object , parameters ) {
    return method && method.apply( object.context || object , parameters );
  }

  // Give joining character given url
  function qMarkOrAmp( url ) {
    return /\?/ .test( url ) ? "&" : "?";
  }

  var // String constants (for better minification)
    STR_ASYNC = "async",
    STR_CHARSET = "charset",
    STR_EMPTY = "",
    STR_ERROR = "error",
    STR_INSERT_BEFORE = "insertBefore",
    STR_JQUERY_JSONP = "_jqjsp",
    STR_ON = "on",
    STR_ON_CLICK = STR_ON + "click",
    STR_ON_ERROR = STR_ON + STR_ERROR,
    STR_ON_LOAD = STR_ON + "load",
    STR_ON_READY_STATE_CHANGE = STR_ON + "readystatechange",
    STR_READY_STATE = "readyState",
    STR_REMOVE_CHILD = "removeChild",
    STR_SCRIPT_TAG = "<script>",
    STR_SUCCESS = "success",
    STR_TIMEOUT = "timeout",

    // Window
    win = window,
    // Deferred
    Deferred = $.Deferred,
    // Head element
    head = $( "head" )[ 0 ] || document.documentElement,
    // Page cache
    pageCache = {},
    // Counter
    count = 0,
    // Last returned value
    lastValue,

    // ###################### DEFAULT OPTIONS ##
    xOptionsDefaults = {
      //beforeSend: undefined,
      //cache: false,
      callback: STR_JQUERY_JSONP,
      //callbackParameter: undefined,
      //charset: undefined,
      //complete: undefined,
      //context: undefined,
      //data: "",
      //dataFilter: undefined,
      //error: undefined,
      //pageCache: false,
      //success: undefined,
      //timeout: 0,
      //traditional: false,
      url: location.href
    },

    // opera demands sniffing :/
    opera = win.opera,

    // IE < 10
    oldIE = !!$( "<div>" ).html( "<!--[if IE]><i><![endif]-->" ).find("i").length;

  // ###################### MAIN FUNCTION ##
  function jsonp( xOptions ) {

    // Build data with default
    xOptions = $.extend( {} , xOptionsDefaults , xOptions );

    // References to xOptions members (for better minification)
    var successCallback = xOptions.success,
      errorCallback = xOptions.error,
      completeCallback = xOptions.complete,
      dataFilter = xOptions.dataFilter,
      callbackParameter = xOptions.callbackParameter,
      successCallbackName = xOptions.callback,
      cacheFlag = xOptions.cache,
      pageCacheFlag = xOptions.pageCache,
      charset = xOptions.charset,
      url = xOptions.url,
      data = xOptions.data,
      timeout = xOptions.timeout,
      pageCached,

      // Abort/done flag
      done = 0,

      // Life-cycle functions
      cleanUp = noop,

      // Support vars
      supportOnload,
      supportOnreadystatechange,

      // Request execution vars
      firstChild,
      script,
      scriptAfter,
      timeoutTimer;

    // If we have Deferreds:
    // - substitute callbacks
    // - promote xOptions to a promise
    Deferred && Deferred(function( defer ) {
      defer.done( successCallback ).fail( errorCallback );
      successCallback = defer.resolve;
      errorCallback = defer.reject;
    }).promise( xOptions );

    // Create the abort method
    xOptions.abort = function() {
      !( done++ ) && cleanUp();
    };

    // Call beforeSend if provided (early abort if false returned)
    if ( callIfDefined( xOptions.beforeSend , xOptions , [ xOptions ] ) === !1 || done ) {
      return xOptions;
    }

    // Control entries
    url = url || STR_EMPTY;
    data = data ? ( (typeof data) == "string" ? data : $.param( data , xOptions.traditional ) ) : STR_EMPTY;

    // Build final url
    url += data ? ( qMarkOrAmp( url ) + data ) : STR_EMPTY;

    // Add callback parameter if provided as option
    callbackParameter && ( url += qMarkOrAmp( url ) + encodeURIComponent( callbackParameter ) + "=?" );

    // Add anticache parameter if needed
    !cacheFlag && !pageCacheFlag && ( url += qMarkOrAmp( url ) + "_" + ( new Date() ).getTime() + "=" );

    // Replace last ? by callback parameter
    url = url.replace( /=\?(&|$)/ , "=" + successCallbackName + "$1" );

    // Success notifier
    function notifySuccess( json ) {

      if ( !( done++ ) ) {

        cleanUp();
        // Pagecache if needed
        pageCacheFlag && ( pageCache [ url ] = { s: [ json ] } );
        // Apply the data filter if provided
        dataFilter && ( json = dataFilter.apply( xOptions , [ json ] ) );
        // Call success then complete
        callIfDefined( successCallback , xOptions , [ json , STR_SUCCESS, xOptions ] );
        callIfDefined( completeCallback , xOptions , [ xOptions , STR_SUCCESS ] );

      }
    }

    // Error notifier
    function notifyError( type ) {

      if ( !( done++ ) ) {

        // Clean up
        cleanUp();
        // If pure error (not timeout), cache if needed
        pageCacheFlag && type != STR_TIMEOUT && ( pageCache[ url ] = type );
        // Call error then complete
        callIfDefined( errorCallback , xOptions , [ xOptions , type ] );
        callIfDefined( completeCallback , xOptions , [ xOptions , type ] );

      }
    }

    // Check page cache
    if ( pageCacheFlag && ( pageCached = pageCache[ url ] ) ) {

      pageCached.s ? notifySuccess( pageCached.s[ 0 ] ) : notifyError( pageCached );

    } else {

      // Install the generic callback
      // (BEWARE: global namespace pollution ahoy)
      win[ successCallbackName ] = genericCallback;

      // Create the script tag
      script = $( STR_SCRIPT_TAG )[ 0 ];
      script.id = STR_JQUERY_JSONP + count++;

      // Set charset if provided
      if ( charset ) {
        script[ STR_CHARSET ] = charset;
      }

      opera && opera.version() < 11.60 ?
        // onerror is not supported: do not set as async and assume in-order execution.
        // Add a trailing script to emulate the event
        ( ( scriptAfter = $( STR_SCRIPT_TAG )[ 0 ] ).text = "document.getElementById('" + script.id + "')." + STR_ON_ERROR + "()" )
      :
        // onerror is supported: set the script as async to avoid requests blocking each others
        ( script[ STR_ASYNC ] = STR_ASYNC )

      ;

      // Internet Explorer: event/htmlFor trick
      if ( oldIE ) {
        script.htmlFor = script.id;
        script.event = STR_ON_CLICK;
      }

      // Attached event handlers
      script[ STR_ON_LOAD ] = script[ STR_ON_ERROR ] = script[ STR_ON_READY_STATE_CHANGE ] = function ( result ) {

        // Test readyState if it exists
        if ( !script[ STR_READY_STATE ] || !/i/.test( script[ STR_READY_STATE ] ) ) {

          try {

            script[ STR_ON_CLICK ] && script[ STR_ON_CLICK ]();

          } catch( _ ) {}

          result = lastValue;
          lastValue = 0;
          result ? notifySuccess( result[ 0 ] ) : notifyError( STR_ERROR );

        }
      };

      // Set source
      script.src = url;

      // Re-declare cleanUp function
      cleanUp = function( i ) {
        timeoutTimer && clearTimeout( timeoutTimer );
        script[ STR_ON_READY_STATE_CHANGE ] = script[ STR_ON_LOAD ] = script[ STR_ON_ERROR ] = null;
        head[ STR_REMOVE_CHILD ]( script );
        scriptAfter && head[ STR_REMOVE_CHILD ]( scriptAfter );
      };

      // Append main script
      head[ STR_INSERT_BEFORE ]( script , ( firstChild = head.firstChild ) );

      // Append trailing script if needed
      scriptAfter && head[ STR_INSERT_BEFORE ]( scriptAfter , firstChild );

      // If a timeout is needed, install it
      timeoutTimer = timeout > 0 && setTimeout( function() {
        notifyError( STR_TIMEOUT );
      } , timeout );

    }

    return xOptions;
  }

  // ###################### SETUP FUNCTION ##
  jsonp.setup = function( xOptions ) {
    $.extend( xOptionsDefaults , xOptions );
  };

  // ###################### INSTALL in jQuery ##
  $.jsonp = jsonp;

} )( jQuery );

/** @license jquery.transloadit2.js: Copyright (c) 2013 Transloadit Ltd | MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Fork this on Github: http://github.com/transloadit/jquery-sdk
 *
 * Transloadit servers allow browsers to cache jquery.transloadit2.js for 1 hour.
 * keep this in mind when rolling out fixes.
 */

!function($) {
  var PROTOCOL = (document.location.protocol == 'https:') ? 'https://' : 'http://';

  var DEFAULT_SERVICE = PROTOCOL + 'api2.transloadit.com/';

  var OPTIONS = {
    service                      : DEFAULT_SERVICE,
    assets                       : PROTOCOL+'assets.transloadit.com/',
    onFileSelect                 : function() {},
    onStart                      : function() {},
    onProgress                   : function() {},
    onUpload                     : function() {},
    onResult                     : function() {},
    onCancel                     : function() {},
    onError                      : function() {},
    onSuccess                    : function() {},
    interval                     : 2500,
    pollTimeout                  : 8000,
    poll404Retries               : 15,
    pollConnectionRetries        : 3,
    wait                         : false,
    processZeroFiles             : true,
    triggerUploadOnFileSelection : false,
    autoSubmit                   : true,
    exclude                      : '',
    fields                       : false,
    params                       : null,
    signature                    : null,
    region                       : 'us-east-1',
    debug                        : true
  };
  var CSS_LOADED = false;

  $.fn.transloadit = function() {
    var args = Array.prototype.slice.call(arguments);
    var method;
    var uploader;
    var r;

    if (this.length === 0) {
      return;
    }

    if (this.length > 1) {
      this.each(function() {
        $.fn.transloadit.apply($(this), args);
      });
      return;
    }

    if (args.length == 1 && typeof args[0] == 'object' || args[0] === undefined) {
      args.unshift('init');
    }

    method = args.shift();
    if (method == 'init') {
      uploader = new Uploader();
      args.unshift(this);
      this.data('transloadit.uploader', uploader);
    } else {
      uploader = this.data('transloadit.uploader');
    }

    if (!uploader) {
      throw new Error('Element is not initialized for transloadit!');
    }

    r = uploader[method].apply(uploader, args);
    return (r === undefined) ? this : r;
  };

  function Uploader() {
    this.assemblyId = null;

    this.instance      = null;
    this.documentTitle = null;
    this.timer         = null;
    this._options      = {};
    this.uploads       = [];
    this.results       = {};
    this.ended         = null;
    this.pollStarted   = null;
    this.pollRetries   = 0;
    this.seq           = 0;
    this.started       = false;
    this.assembly      = null;
    this.params        = null;

    this.bytesReceivedBefore = 0;
    this.lastPoll            = 0;

    this.$params     = null;
    this.$form       = null;
    this.$files      = null;
    this.$fileClones = null;
    this.$iframe     = null;

    this._lastMSecs = 0;
    this._lastNSecs = 0;
    this._clockseq  = 0;
  }

  Uploader.prototype.init = function($form, options) {
    this.$form = $form;
    this.options($.extend({}, OPTIONS, options || {}));

    var self = this;
    $form.bind('submit.transloadit', function() {
      self.validate();
      self.detectFileInputs();
      self.checkFileTypes();

      if (!self._options['processZeroFiles'] && self.$files.length === 0) {
        self.submitForm();
      } else {
        self.getBoredInstance();
      }

      return false;
    });

    if (this._options['triggerUploadOnFileSelection']) {
      $form.on('change', 'input[type="file"]', function() {
        $form.trigger('submit.transloadit');
      });
    }

    $form.on('change', 'input[type="file"]', function() {
      self._options.onFileSelect($(this).val(), $(this));
    });

    this.includeCss();
  };

  Uploader.prototype.getBoredInstance = function() {
    var self = this;

    this.instance              = null;
    var url                    = this._options['service'] + 'instances/bored';
    var canUseCustomBoredLogic = true;

    function proceed() {
      $.jsonp({
        url: url,
        timeout: self._options.pollTimeout,
        callbackParameter: 'callback',
        success: function(instance) {
          if (instance.error) {
            self.ended   = true;
            instance.url = url;
            self.renderError(instance);
            self._options.onError(instance);
            return;
          }

          self.instance = instance.api2_host;
          self.start();
        },
        error: function(xhr, status) {
          if (canUseCustomBoredLogic && self._options['service'] === DEFAULT_SERVICE && PROTOCOL !== 'https://') {
            canUseCustomBoredLogic = false;

            self._findBoredInstanceUrl(function(err, theUrl) {
              if (err) {
                self.ended = true;
                err = {
                  error   : 'BORED_INSTANCE_ERROR',
                  message : 'Could not find a bored instance. ' + err.message
                };
                self.renderError(err);
                self._options.onError(err);
                return;
              }

              url = PROTOCOL + 'api2.' + theUrl + '/instances/bored';
              proceed();
            });
            return;
          }

          self.ended = true;
          var err = {
            error   : 'CONNECTION_ERROR',
            message : 'There was a problem connecting to the upload server',
            reason  : 'JSONP request status: ' + status,
            url     : url
          };
          self.renderError(err);
          self._options.onError(err);
        }
      });
    }

    proceed();
  };

  Uploader.prototype._findBoredInstanceUrl = function(cb) {
    var self = this;
    var url  = 'http://infra-' + this._options.region + '.transloadit.com.s3.amazonaws.com/cached_instances.json';

    $.ajax({
      url      : url,
      datatype : 'json',
      timeout  : 3000,
      success: function(result) {
        var instances = self._shuffle(result.uploaders);
        self._findResponsiveInstance(instances, 0, cb);
      },
      error: function(xhr, status) {
        var err = new Error('Could not query S3 for cached uploaders');
        cb(err);
      }
    });
  };

  Uploader.prototype._findResponsiveInstance = function(instances, index, cb) {
    if (!instances[index]) {
      var err = new Error('No responsive uploaders');
      return cb(err);
    }

    var self = this;
    var url  = instances[index];

    $.jsonp({
      url               : PROTOCOL + url,
      timeout           : 3000,
      callbackParameter : 'callback',
      success: function(result) {
        cb(null, url);
      },
      error: function(xhr, status) {
        self._findResponsiveInstance(instances, index + 1, cb);
      }
    });
  };

  Uploader.prototype._shuffle = function(arr) {
    var shuffled = [];
    var rand;
    for (var i = 0; i < arr.length; i++) {
      rand           = Math.floor(Math.random() * (i + 1));
      shuffled[i]    = shuffled[rand];
      shuffled[rand] = arr[i];
    }
    return shuffled;
  };

  Uploader.prototype.start = function() {
    var self = this;

    this.started             = false;
    this.ended               = false;
    this.bytesReceivedBefore = 0;
    this.pollRetries         = 0;
    this.seq                 = 0;
    this.uploads             = [];
    this.results             = {};

    this.assemblyId = this._genUuid();

    this.$fileClones = $().not(document);
    this.$files.each(function() {
      var $clone = $(this).clone(true);
      self.$fileClones = self.$fileClones.add($clone);
      $clone.insertAfter(this);
    });

    this.$iframe = $('<iframe id="transloadit-'+this.assemblyId+'" name="transloadit-'+this.assemblyId+'"/>')
      .appendTo('body')
      .hide();

    var url = PROTOCOL+this.instance+'/assemblies/'+this.assemblyId+'?redirect=false';

    if (this._options.formData) {
      this._options.formData.append("params", this.$form.find("input[name=params]").val());
      var f = new XMLHttpRequest();
      f.open("POST", url);
      f.send(this._options.formData);
    } else {
      this.$uploadForm = $('<form enctype="multipart/form-data" />')
        .attr('action', url)
        .attr('target', 'transloadit-' + this.assemblyId)
        .attr('method', 'POST')
        .append(this.$files)
        .appendTo('body')
        .hide();

      var fieldsFilter = '[name=params], [name=signature]';
      if (this._options.fields === true) {
        fieldsFilter = '*';
      } else if (typeof this._options.fields === 'string') {
        fieldsFilter += ', ' + this._options.fields;
      }

      var $fieldsToClone = this.$form.find(':input[type!=file]').filter(fieldsFilter);

      // remove selects from $clones, because we have to clone them as hidden input
      // fields, otherwise their values are not transferred properly
      var $selects = $fieldsToClone.filter('select');

      $fieldsToClone = $fieldsToClone.filter(function() {
        return !$(this).is('select');
      });

      // filter out submit elements as they will cause funny behavior in the
      // shadow form
      $fieldsToClone = $fieldsToClone.filter('[type!=submit]');


      var $clones = this.clone($fieldsToClone);

      if (this._options.params && !this.$params) {
        $clones = $clones.add('<input name="params" value=\'' + JSON.stringify(this._options.params) + '\'>');
      }
      if (this._options.signature) {
        $clones = $clones.add('<input name="signature" value=\'' + this._options.signature + '\'>');
      }

      if (typeof this._options.fields == 'object') {
        for (var fieldName in this._options.fields) {
          var fieldValue = this._options.fields[fieldName];
          $clones = $clones.add('<input name="' + fieldName + '" value=\'' + fieldValue + '\'>');
        }
      }

      $clones.prependTo(this.$uploadForm);


      // now add all selects as hidden fields
      $selects.each(function() {
        $('<input type="hidden"/>')
          .attr('name', $(this).attr('name'))
          .attr('value', $(this).val())
          .prependTo(self.$uploadForm);
      });

      this.$uploadForm.submit();
    }

    this.lastPoll = +new Date();
    setTimeout(function() {
      self._poll();
    }, 300);
  };

  Uploader.prototype.clone = function($obj) {
    var $result         = $obj.clone();
    var myTextareas     = $obj.filter('textarea');
    var resultTextareas = $result.filter('textarea');

    for (var i = 0; i < myTextareas.length; ++i) {
      $(resultTextareas[i]).val($(myTextareas[i]).val());
    }

    return $result;
  };

  Uploader.prototype.checkFileTypes = function() {
    var self = this;

    function typeStringToArray(types) {
      if (/image\/jpg/g.test(types) && !/image\/jpeg/g.test(types)) {
        types += ',image/jpeg';
      }
      if (/image\/jpeg/g.test(types) && !/image\/jpg/g.test(types)) {
        types += ',image/jpg';
      }

      if (types.indexOf('video/*') !== -1) {
        types = types.replace(/video\/\*/g, 'video/mp4,video/flv,video/avi,video/mpg,video/mov,video/wmv,video/h264,video/mkv,video/ogv');
      }
      if (types.indexOf('image/*') !== -1) {
        types = types.replace(/image\/\*/g, 'image/png,image/jpeg,image/gif,image/jpg,image/ico');
      }
      if (types.indexOf('audio/*') !== -1) {
        types = types.replace(/audio\/\*/g, 'audio/aac,audio/mp3,audio/flac,audio/m4a,audio/mmf,audio/3gp,audio/mp4,audio/mpeg,audio/ogg,audio/wav,audio/webm');
      }
      return types.split(',');
    }

    this.$files = this.$files.filter(function() {
      var acceptedTypes = $(this).attr('accept');
      if (!acceptedTypes) {
        return true;
      }

      acceptedTypes = typeStringToArray(acceptedTypes);

      var fileExt = this.value.split('.').pop().toLowerCase();
      for (var i = 0; i < acceptedTypes.length; i++) {
        if (fileExt == acceptedTypes[i].split('/')[1]) {
          return true;
        }
      }

      var err = {
        error   : 'INVALID_FILE_TYPE',
        message : 'Sorry, we don\'t accept ' + fileExt + ' files.',
        reason  : 'Invalid file selected'
      };
      self._options.onError(err);
      return false;
    });
  };

  Uploader.prototype.detectFileInputs = function() {
    var $files = this.$form
      .find('input[type=file]')
      .not(this._options.exclude);

    if (!this._options['processZeroFiles']) {
      $files = $files.filter(function() {
        return this.value !== '';
      });
    }
    this.$files = $files;
  };

  Uploader.prototype.validate = function() {
    if (!this._options.params) {
      var $params = this.$form.find('input[name=params]');
      if (!$params.length) {
        alert('Could not find input[name=params] in your form.');
        return;
      }

      this.$params = $params;
      try {
        this.params = JSON.parse($params.val());
      } catch (e) {
        alert('Error: input[name=params] seems to contain invalid JSON.');
        return;
      }
    } else {
      this.params = this._options.params;
    }

    if (this.params.redirect_url) {
      this.$form.attr('action', this.params.redirect_url);
    } else if (this._options.autoSubmit && (this.$form.attr('action') == this._options.service+'assemblies')) {
      alert('Error: input[name=params] does not include a redirect_url');
      return;
    }
  };

  Uploader.prototype._poll = function(query) {
    var self = this;
    if (this.ended) {
      return;
    }

    // Reduce Firefox Title Flickering
    var match = /(mozilla)(?:.*? rv:([\w.]+))?/.exec(navigator.userAgent);
    var isMozilla = match && match[1];
    this.documentTitle = document.title;
    if (isMozilla && !this.documentTitle) {
      document.title = 'Loading...';
    }

    this.pollStarted = +new Date();

    var url = PROTOCOL+this.instance+'/assemblies/'+this.assemblyId+(query || '?seq='+this.seq);
    $.jsonp({
      url: url,
      timeout: self._options.pollTimeout,
      callbackParameter: 'callback',
      success: function(assembly) {
        if (self.ended) {
          return;
        }

        self.assembly = assembly;
        if (assembly.error == 'ASSEMBLY_NOT_FOUND') {
          self.pollRetries++;

          if (self.pollRetries > self._options.poll404Retries) {
            document.title = self.documentTitle;
            self.ended = true;
            self.renderError(assembly);
            self._options.onError(assembly);
            return;
          }

          setTimeout(function() {
            self._poll();
          }, 400);
          return;
        }
        if (assembly.error) {
          self.ended = true;
          self.renderError(assembly);
          document.title = self.documentTitle;
          self._options.onError(assembly);
          return;
        }

        self.seq = assembly.last_seq;

        if (!self.started) {
          self.started = true;
          self._options.onStart(assembly);
        }

        self.pollRetries = 0;
        var isUploading = assembly.ok === 'ASSEMBLY_UPLOADING';
        var isExecuting = assembly.ok === 'ASSEMBLY_EXECUTING';
        var isCanceled  = assembly.ok === 'ASSEMBLY_CANCELED';
        var isComplete  = assembly.ok === 'ASSEMBLY_COMPLETED';

        self._options.onProgress(assembly.bytes_received, assembly.bytes_expected, assembly);

        for (var i = 0; i < assembly.uploads.length; i++) {
          self._options.onUpload(assembly.uploads[i], assembly);
          self.uploads.push(assembly.uploads[i]);
        }

        for (var step in assembly.results) {
          self.results[step] = self.results[step] || [];
          for (var j = 0; j < assembly.results[step].length; j++) {
            self._options.onResult(step, assembly.results[step][j], assembly);
            self.results[step].push(assembly.results[step][j]);
          }
        }

        if (isCanceled) {
          self.ended = true;
          document.title = self.documentTitle;
          self._options.onCancel(assembly);
          return;
        }

        self.renderProgress(assembly);

        if (isComplete || (!self._options['wait'] && isExecuting)) {
          self.ended = true;
          document.title = self.documentTitle;
          assembly.uploads = self.uploads;
          assembly.results = self.results;
          self._options.onSuccess(assembly);

          self.submitForm();
          return;
        }

        var ping    = self.pollStarted - +new Date();
        var timeout = ping < self._options.interval ? self._options.interval : ping;

        self.timer = setTimeout(function() {
          self._poll();
        }, timeout);
        self.lastPoll = +new Date();
      },
      error: function(xhr, status) {
        if (self.ended) {
          return;
        }

        self.pollRetries++;
        if (self.pollRetries > self._options.pollConnectionRetries) {
          document.title = self.documentTitle;
          self.ended = true;
          var err = {
            error   : 'CONNECTION_ERROR',
            message : 'There was a problem connecting to the upload server',
            reason  : 'JSONP request status: '+status,
            url     : url
          };
          self.renderError(err);
          self._options.onError(err);
          return;
        }

        setTimeout(function() {
          self._poll();
        }, 350);
      }
    });
  };

  Uploader.prototype.stop = function() {
    document.title = this.documentTitle;
    this.ended = true;
  };


  Uploader.prototype.cancel = function() {
    // @todo this has still a race condition if a new upload is started
    // while the cancel request is still being executed. Shouldn't happen
    // in real life, but needs fixing.

    if (!this.ended) {
      var self = this;
      if (this.$params) {
        this.$params.prependTo(this.$form);
      }

      this.$fileClones.each(function(i) {
        var $original = $(self.$files[i]).clone(true);
        var $clone = $(this);
        $original.insertAfter($clone);
        $clone.remove();
      });
      clearTimeout(self.timer);

      this._poll('?method=delete');

      if (navigator.appName == 'Microsoft Internet Explorer') {
        this.$iframe[0].contentWindow.document.execCommand('Stop');
      }

      setTimeout(function() {
        self.$iframe.remove();
      }, 500);
    }

  };

  Uploader.prototype.submitForm = function() {
    if (this.assembly !== null) {
      $('<textarea/>')
        .attr('name', 'transloadit')
        .text(JSON.stringify(this.assembly))
        .prependTo(this.$form)
        .hide();
    }

    if (this._options.autoSubmit) {
      this.$form
        .unbind('submit.transloadit')
        .submit();
    }
  };

  Uploader.prototype.getUTCDatetime = function() {
    var now = new Date();
    var d = new Date(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    );

    var pad = function (n) {
      return n < 10 ? '0' + n : n;
    };
    var tz = d.getTimezoneOffset();
    var tzs = (tz > 0 ? "-" : "+") + pad(parseInt(tz / 60, 10));

    if (tz % 60 !== 0) {
      tzs += pad(tz % 60);
    }

    if (tz === 0) {
      tzs = 'Z';
    }

    return d.getFullYear() + '-' +
        pad(d.getMonth() + 1) + '-' +
        pad(d.getDate()) + 'T' +
        pad(d.getHours()) + ':' +
        pad(d.getMinutes()) + ':' +
        pad(d.getSeconds()) + tzs;
  };

  Uploader.prototype._genUuid = function(options, buf, offset) {
    options = options || {};

    var i = buf && offset || 0;
    var b = buf || [];

    var _rnds = new Array(16);
    var _rng = function() {
      for (var j = 0, r; j < 16; j++) {
        if ((j & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[j] = r >>> ((j & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
    var _seedBytes = _rng();

    var _nodeId = [
      _seedBytes[0] | 0x01,
      _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
    ];

    this._clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;
    var clockseq = options.clockseq != null ? options.clockseq : this._clockseq;

    var _byteToHex = [];
    var _hexToByte = {};
    for (var j = 0; j < 256; j++) {
      _byteToHex[j] = (j + 0x100).toString(16).substr(1);
      _hexToByte[_byteToHex[j]] = j;
    }

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : this._lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - this._lastMSecs) + (nsecs - this._lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > this._lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    this._lastMSecs = msecs;
    this._lastNSecs = nsecs;
    this._clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;

    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    function unparse(_buf, offset) {
      var i = offset || 0, bth = _byteToHex;

      return  bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]] +
              bth[_buf[i++]] + bth[_buf[i++]];
    }

    return buf ? buf : unparse(b);
  };

  Uploader.prototype.options = function(options) {
    if (arguments.length === 0) {
      return this._options;
    }

    $.extend(this._options, options);
  };

  Uploader.prototype.option = function(key, val) {
    if (arguments.length == 1) {
      return this._options[key];
    }

    this._options[key] = val;
  };

}(jQuery);


return jQuery;

});
