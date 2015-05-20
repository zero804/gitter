'use strict';

module.exports = {
  attachElContent: function(html) {
      var el = this.el;
      if (typeof html === 'string') {
        el.innerHTML = html;
        return this;
      }

      function isWhitespace(char) {
        return char === '\n' || char === ' ' || char === '\t';
      }

      if (html.length) {
        el.innerHTML = '';
        var len = html.length;
        for(var i = 0; i < len; i++) {
          var chunk = html[i];
          /* Ignore empty text chunks */
          if (chunk.nodeType === 3 && chunk.textContent.length === 1 && isWhitespace(chunk.textContent[0])) continue;
          el.appendChild(chunk);
        }
        return this;
      }

      this.$el.html(html);
      return this;
  }
};
