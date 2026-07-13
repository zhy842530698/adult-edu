import React, { Component } from 'react';
import './app.css';

class App extends Component<{ children?: React.ReactNode }> {
  render() { return this.props.children; }
}
export default App;
