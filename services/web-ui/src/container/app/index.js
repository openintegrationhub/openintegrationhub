import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Route, Switch } from 'react-router-dom';
import Main from '../main';
import Auth from '../auth';
// import UserManagement from '../../component/user-management';
import LoginCheck from '../../component/login-check';

import './index.css';

function App() {
    document.title = 'Web UI';
    return (
        <Switch>
            <Route exact path="/auth" component={Auth} />
            <LoginCheck>
                {/* <Route exact path="/user" component={UserManagement} /> */}
                <Route path="/" component={Main} />
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
