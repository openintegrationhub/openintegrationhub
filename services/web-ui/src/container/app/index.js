import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import { hot } from 'react-hot-loader/root';
import flow from 'lodash/flow';


import Main from '../main';
import Auth from '../auth';
import LoginCheck from '../../component/login-check';


function App() {
    document.title = 'Web UI';
    return (
        <Switch>
            <Route exact path="/auth" component={Auth} />
            <LoginCheck>

                <Route path="/" component={Main} />
            </LoginCheck>
        </Switch>
    );
}

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    hot,
)(App);
