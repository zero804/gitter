"use strict";

import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'Modal',
  propTypes: {
    active: PropTypes.bool.isRequired
  },

  render(){
    var { active } = this.props;
    var className = !!active ? 'modal--active' : 'modal';
    return (
      <section className={ className }>
        <article>
          { this.props.children }
        </article>
      </section>
    );
  }

});
