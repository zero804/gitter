'use strict';

// source: https://github.com/emberjs/ember.js/blob/v2.3.0/packages/ember-htmlbars/lib/helpers/if_unless.js

/**
  Use the `if` block helper to conditionally render a block depending on a
  property. If the property is "falsey", for example: `false`, `undefined`,
 `null`, `""`, `0` or an empty array, the block will not be rendered.
 ```handlebars
  {{! will not render if foo is falsey}}
  {{#if foo}}
    Welcome to the {{foo.bar}}
  {{/if}}
  ```
  You can also specify a template to show if the property is falsey by using
  the `else` helper.
  ```handlebars
  {{!Is it raining outside?}}
  {{#if isRaining}}
    Yes, grab an umbrella!
  {{else}}
    No, it's lovely outside!
  {{/if}}
  ```
  You are also able to combine `else` and `if` helpers to create more complex
  conditional logic.
  ```handlebars
  {{#if isMorning}}
    Good morning
  {{else if isAfternoon}}
    Good afternoon
  {{else}}
    Good night
  {{/if}}
  ```
  You can use `if` inline to conditionally render a single property or string.
  This helper acts like a ternary operator. If the first property is truthy,
  the second argument will be displayed, if not, the third argument will be
  displayed
  ```handlebars
  {{if useLongGreeting "Hello" "Hi"}} Dave
  ```
  Finally, you can use the `if` helper inside another helper as a subexpression.
  ```handlebars
  {{some-component height=(if isBig "100" "10")}}
  ```
  @method if
  @for Ember.Templates.helpers
  @public
*/
function ifHelper(params, hash, options) {
  params = params || [];
  return params[0] ? params[1] : params[2]
}


module.exports = ifHelper;
