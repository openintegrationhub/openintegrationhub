import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import Home from '../home';
import Auth from '../auth';
import UserManagement from '../usermanagement';
import LoginCheck from '../../component/login-check';

import './index.css';

function App() {
    document.title = 'Web UI';
    return (
        <Switch>
            <Route exact path="/auth" component={Auth} />
            <LoginCheck>
                <Route exact path="/user" component={UserManagement} />
                <Route exact path="/" component={Home} />
            </LoginCheck>
        </Switch>
    );
}

const mapStateToProps = () => ({});
const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(App);
