import Flows from './component/flows';
import Home from './component/home';
import Users from './component/users';
import Tenants from './component/tenants';
import Components from './component/components';
import HubAndSpoke from './component/hub-and-spoke';
import HubAndSpokeDetails from './component/hub-and-spoke/details';
import AppDirectory from './component/app-directory';
import AppDetails from './component/app-directory/app-details';
import MetaData from './component/metadata';
import Secrets from './component/secrets';
import Roles from './component/roles';
import Profile from './component/profile';

export default [
    {
        path: '/',
        component: Home,
        exact: true,
    },
    {
        path: '/app-directory',
        component: AppDirectory,
        exact: true,
    },
    {
        path: '/app-details/:id',
        component: AppDetails,
        exact: true,
    },
    {
        path: '/components',
        component: Components,
        exact: true,
    },
    {
        path: '/flows',
        component: Flows,
        exact: true,
    },
    {
        path: '/hub-and-spoke',
        component: HubAndSpoke,
        exact: true,
    },
    {
        path: '/hub-and-spoke/:id',
        component: HubAndSpokeDetails,
        exact: true,
    },
    {
        path: '/metadata',
        component: MetaData,
        exact: true,
    },
    {
        path: '/profile',
        component: Profile,
        exact: true,
    },
    {
        path: '/roles',
        component: Roles,
        exact: true,
    },
    {
        path: '/secrets',
        component: Secrets,
        exact: true,
    },
    {
        path: '/tenants',
        component: Tenants,
        exact: true,
    },
    {
        path: '/users',
        component: Users,
        exact: true,
    },
];
