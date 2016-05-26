"use strict";

module.exports = (function() {


  /**
   * processHeaders() creates the optional headers string for the mailto protocol
   *
   * args       Object - object in which the "search for headers" happens
   * returns    String - the final (but optional) headers string
   */
  var processHeaders = function (args) {
    /* mailto protocol optional headers */
    return ['subject', 'body', 'CC', 'BCC']
      .map(function (header) { return header + '=' + (args[header] || ''); }) // composes the string as `key=value`
      .join('&'); // joins all headers with an &, as required by the mailto protocol
  };

  /**
   * composeLink() composes the href of a mailto <a> tag
   *
   * target     String - email or nothing;
   * headers    Object - contains the headers and their respective values
   *
   * return     String - composed mailto protocol string `x`,  for use in <a href='{x}'>
   */
  var composeLink = function (target, headers) {
    return "mailto:" + target + '?' + headers;
  };

  /**
   * createAnchorElement() creates an anchor element with href set to mailto
   *
   * args       Object (all keys are optional, see options below):
   *              - target:   email to be set
   *              - content:  inner html of the <a> tag
   *              - subject:  message subject field
   *              - body:     message content
   *              - CC:       carbon copy email addresses (comma separated)
   *              - BCC:      blind carbon copy email addresses (comma separated)
   *
   * returns    DOM Element <a>
   */
  var createAnchorElement = function (args) {
    var a = document.createElement('a');
    var target = args.target || '';

    a.href = composeLink(target, processHeaders(args));
    a.innerHTML = args.content || '';

    return a;
  };

  /**
   * createAnchorString() creates an anchor element as a string
   *
   * args       Object - See createAnchorElement()
   * returns    String - <a> as a string
   */
  var createAnchorString = function (args) {
    return createAnchorElement.call(this, args).outerHTML;
  };

  /* public interface */
  return {
    el: createAnchorElement,
    str: createAnchorString
  };


})();

