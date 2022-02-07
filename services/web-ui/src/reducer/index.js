import { combineReducers } from 'redux';
import auth from './auth';
import users from './users';
import tenants from './tenants';
import roles from './roles';
import flows from './flows';
import components from './components';
import apps from './apps';
import hubAndSpoke from './hubSpoke';
import metadata from './metadata';
import authClients from './auth-clients';
import secrets from './secrets';
import dataHub from './data-hub';
import { LOGOUT } from '../action/auth';

const appReducer = combineReducers({
    users,
    tenants,
    roles,
    auth,
    flows,
    components,
    apps,
    hubAndSpoke,
    metadata,
    secrets,
    authClients,
    dataHub,
});

export default (state, action) => {
    if (action.type === LOGOUT) {
        state = undefined; // eslint-disable-line no-param-reassign
    }

    return appReducer(state, action);
};
