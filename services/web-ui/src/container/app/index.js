import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import Home from '../home';
import Login from '../login';
import UserManagement from '../usermanagement';
import LoginCheck from '../../component/login-check';

import './index.css';

function App() {
    return (

        <Switch>
            <Route exact path="/auth" component={Login} />
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
