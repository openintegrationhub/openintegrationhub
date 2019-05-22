import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import Home from '../home';
import Foo from '../foo';

import './index.css';

function App() {
    return (
        <Switch>
            <Route exact path="/foo" component={Foo} />
            <Route exact path="/" component={Home} />
        </Switch>
    );
}

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(App);
