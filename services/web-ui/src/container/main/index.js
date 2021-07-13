import React, { useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import flow from 'lodash/flow';
import { Route, Switch, withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
// Ui
import { withStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import CssBaseline from '@material-ui/core/CssBaseline';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import NativeSelect from '@material-ui/core/NativeSelect';
import Grid from '@material-ui/core/Grid';
import {
    Apps as AppsIcon, Person, LockOpen, Business, SettingsInputComponent, LinearScale, Home as HomeIcon, AccountCircle, DeviceHub, Security, EnhancedEncryption,
} from '@material-ui/icons';

// Actions & Components

import { Button } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { logout } from '../../action/auth';
import { getUsers } from '../../action/users';
import routes from '../../routes';

const drawerWidth = 240;

const styles = theme => ({
    root: {
        display: 'flex',
    },
    appBar: {
        position: 'inherit',
        backgroundImage: 'linear-gradient(73deg, #ff8200, #ff2473)',
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    appBarShift: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginLeft: 12,
        width: 69,
    },
    hide: {
        display: 'none',
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
    },
    drawerPaper: {
        width: drawerWidth,

    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        ...theme.mixins.toolbar,
        justifyContent: 'flex-end',
        backgroundColor: '#ff8200',
    },
    content: {
        flexGrow: 1,
        height: '90vh',
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    contentShift: {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: drawerWidth,
    },
    select: {
        color: 'white',
        width: '100%',
        paddingTop: '4px',
    },
    drawerIcon: {
        marginRight: '20px',
        width: 'auto',
    },
});

const MENU = {
    START: {
        label: 'Start',
        icon: <HomeIcon />,
        path: '/',
    },
    PROFILE: {
        label: 'Profile',
        icon: <Person />,
        path: '/profile',
    },
    FLOWS: {
        label: 'Flows',
        icon: <LinearScale />,
        path: '/flows',
    },
    ROLES: {
        label: 'Roles',
        icon: <Security />,
        path: '/roles',
    },
    APP_DIRECTORY: {
        label: 'App-Directory',
        icon: <AppsIcon />,
        path: '/app-directory',
    },
    HUB_AND_SPOKE: {
        label: 'Hub & Spoke',
        icon: <AppsIcon />,
        path: '/hub-and-spoke',
    },
    COMPONENTS: {
        label: 'Components',
        icon: <SettingsInputComponent />,
        path: '/components',
    },
    METADATA: {
        label: 'Metadata',
        icon: <DeviceHub />,
        path: '/metadata',
    },
    SECRETS: {
        label: 'Secrets',
        icon: <EnhancedEncryption />,
        path: '/secrets',
    },
};

const ADMIN_MENU = {
    USERS: {
        label: 'Users',
        icon: <AccountCircle />,
        path: '/users',
    },
    TENANTS: {
        label: 'Tenants',
        icon: <Business />,
        path: '/tenants',
    },

};

const Main = (props) => {
    const [open, setOpen] = useState(false);
    const [context, setContext] = useState(null);

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    const getTenants = () => {
        if (props.auth.memberships && props.auth.memberships.length) {
            return props.auth.memberships.map((tenant, index) => <option key={`tenant-${index}`} value={tenant.name}>{tenant.name}</option>);
        }
        return null;
    };

    const changeSelect = (event) => {
        setContext(event.target.value);
    };

    const getMenuItems = () => {
        const menuCopy = [...Object.values(MENU)];
        if (props.auth.isAdmin) {
            menuCopy.splice(1, 0, ADMIN_MENU.TENANTS);
            menuCopy.splice(1, 0, ADMIN_MENU.USERS);
        }
        if (props.auth.isTenantAdmin) {
            menuCopy.splice(1, 0, ADMIN_MENU.USERS);
        }
        return <div>
            {
                menuCopy.map(menuItem => <ListItem button key={menuItem.label} onClick={() => { props.history.push(menuItem.path); setOpen(false); }}>
                    <ListItemIcon>{menuItem.icon}</ListItemIcon>
                    <ListItemText primary={menuItem.label} />
                </ListItem>)
            }
            <ListItem button key={'Logout'} onClick={() => props.logout()}>
                <ListItemIcon><LockOpen /></ListItemIcon>
                <ListItemText primary={'Logout'} />
            </ListItem>
        </div>;
    };

    const { classes, theme } = props;
    const { t, i18n } = useTranslation();
    return (
        <Grid container className={classes.root}>
            <CssBaseline />
            <Drawer
                className={classes.drawer}
                variant="persistent"
                anchor="left"
                open={open}
                classes={{
                    paper: classes.drawerPaper,
                }}
            >
                <div className={classes.drawerHeader}>
                    <IconButton onClick={handleDrawerClose}>
                        {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </div>

                <List>
                    {getMenuItems()}
                </List>
            </Drawer>
            <Grid item xs={12}>
                <AppBar
                    className={classNames(classes.appBar, {
                        [classes.appBarShift]: open,
                    })}
                >
                    <Toolbar disableGutters={!open}>
                        <Grid container>
                            <IconButton
                                color="inherit"
                                aria-label="Open drawer"
                                onClick={handleDrawerOpen}
                                className={classNames(classes.menuButton, classes.drawerIcon, open && classes.hide)}
                            >
                                <MenuIcon />
                            </IconButton>

                            {
                                context && <Grid item xs={1}>
                                    <NativeSelect
                                        value={context}
                                        onChange={changeSelect}
                                        name="tenants"
                                        className={classes.select}
                                        inputProps={{ 'aria-label': 'age' }}
                                    >
                                        <option value="Global">{context}</option>
                                        {
                                            getTenants()
                                        }
                                    </NativeSelect>
                                </Grid>
                            }

                            <Grid item xs={6}>
                                <img
                                    src="https://www.openintegrationhub.org/wp-content/uploads/2018/07/oih-logo.svg"
                                    alt="Open Integration Hub"
                                    id="logo"
                                    data-height-percentage="54"
                                    data-actual-width="271"
                                    data-actual-height="40"
                                />

                            </Grid>
                            <Grid container item xs={5} justify='flex-end' wrap='nowrap'>
                                <Grid item style={{ marginTop: '10px' }}>
                                    <span style={{ marginRight: '5px' }}>{t('hello')}</span>
                                    <span style={{ marginRight: '20px' }}>{props.auth.username}</span>
                                    <span style={{ marginRight: '5px' }} onClick={() => i18n.changeLanguage('en-US')}>EN</span>
                                    <span style={{ marginRight: '5px' }} onClick={() => i18n.changeLanguage('de-DE')}>DE</span>

                                </Grid>
                                <Grid item>
                                    <Button
                                        style={{
                                            width: '100px',
                                            marginTop: '3px',
                                            marginLeft: '6px',
                                        }}
                                        onClick={() => {
                                            props.history.push('/profile');
                                        }}>
                                        <Person />
                                    </Button>
                                </Grid>
                            </Grid>

                        </Grid>

                    </Toolbar>
                </AppBar>
            </Grid>
            <Grid item xs={12}>
                <main
                    className={classNames(classes.content, {
                        [classes.contentShift]: open,
                    })}
                >
                    <Switch>
                        {routes.map(route => (
                            <Route path={route.path}
                                key={route.path}
                                exact={route.exact}
                                component={route.component}/>))}
                    </Switch>
                </main>
            </Grid>

        </Grid>
    );
};

Main.propTypes = {
    classes: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
};

const mapStateToProps = state => ({
    auth: state.auth,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getUsers,
    logout,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withRouter,
    withStyles(styles, { withTheme: true }),
)(Main);
