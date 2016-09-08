import React, { PropTypes } from 'react';
import {ESC_KEY} from '../../constants/keys';

export default React.createClass({

  displayName: 'Modal',
  propTypes: {
    active: PropTypes.bool.isRequired,
    children: PropTypes.node,
    onClose: PropTypes.func,
  },

  componentDidMount(){
    window.addEventListener('keyup', this.onKeyPressed); // eslint-disable-line no-undef
  },

  componentWillUnmount(){
    window.removeEventListener('keyup', this.onKeyPressed); // eslint-disable-line no-undef
  },

  render(){
    var { active } = this.props;
    var className = !!active ? 'modal--active' : 'modal';
    return (
      <section className={ className }>
        <button
          className="modal__close-btn"
          onClick={this.onCloseButtonClicked}>
          ×
        </button>
        <article className="modal__body">
          { this.props.children }
        </article>
      </section>
    );
  },

  onKeyPressed(e){
    if(e.keyCode !== ESC_KEY){ return; }
    e.preventDefault();
    this.onCloseActivated();
  },

  onCloseButtonClicked(e){
    e.preventDefault();
    this.onCloseActivated();
  },

  onCloseActivated(){
    const {onClose} = this.props;
    if(!onClose) { return; }
    return onClose();
  }

});
