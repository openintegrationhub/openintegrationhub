import React from 'react';
import { withStyles } from '@material-ui/styles';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import {
    Add, Remove,
} from '@material-ui/icons';

import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import withSideSheet from '../../hoc/with-side-sheet';
import withForm from '../../hoc/with-form';
import * as usersActions from '../../action/users';
import { getConfig } from '../../conf';
import SnackBar from '../snack-bar';
import { getMessage } from '../../error';

const conf = getConfig();

const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
    form: {
        float: 'none',
        margin: 'auto',
        width: 500,
    },
    frame: {
        height: '100vh',
    },
    formControl: {
        margin: '10px',
        width: '100%',
    },
};

class EditUser extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pending: false,
            succeeded: false,
            selectValue: '',
            roles: [],
            selectableroles: [],
        };
    }

    componentDidMount() {
        if (this.props.userId) {
            const currentUser = this.props.users.all.find((user) => user._id === this.props.userId);
            const currentTenantOfUser = currentUser.tenant && this.props.tenants.all.find((tenant) => tenant._id === currentUser.tenant);
            this.props.setFormData({
                _id: this.props.userId,
                username: currentUser.username,
                firstname: currentUser.firstname,
                lastname: currentUser.lastname,
                tenant: currentTenantOfUser || '',
                role: currentUser.role,
                status: currentUser.status,
                password: '',
            });
            if (this.props.roles && currentUser.roles) {
                const arr = [];
                // eslint-disable-next-line no-restricted-syntax
                for (const role of this.props.roles.all) {
                    if (currentUser.roles.includes(role._id)) arr.push(role);
                }
                this.setState({
                    roles: arr,
                });
            }
            if (currentUser && !currentUser.roles) currentUser.roles = [];
            if (this.props.roles && currentUser.roles) {
                const arr = [];
                const arrSelectable = [];
                // eslint-disable-next-line no-restricted-syntax
                for (const role of this.props.roles.all) {
                    if (currentUser.roles.includes(role._id)) arr.push(role);
                    else arrSelectable.push(role);
                }
                this.setState({
                    roles: arr,
                    selectableroles: arrSelectable,
                });
            }
        } else {
            let adminTenant = this.props.tenants.all.find((tenant) => tenant._id === this.props.auth.tenant);
            if (this.props.auth.isAdmin) {
                adminTenant = '';
            }
            this.props.setFormData({
                username: '',
                firstname: '',
                lastname: '',
                tenant: adminTenant,
                roles: [],
                status: conf.account.status.ACTIVE,
                password: '',
            });
            this.setState({
                selectableroles: this.props.roles.all,
            });
        }
    }

    componentDidUpdate(prevProps, prefstate) {
        if (this.props.users.error && !prevProps.users.error) {
            this.setState({
                pending: false,
                succeeded: false,
            });
            return;
        }
        if (this.state.pending) {
            if (this.props.userId) {
                const prevUser = prevProps.users.all.find((user) => user._id === prevProps.userId);
                const currentUser = this.props.users.all.find((user) => user._id === this.props.userId);
                if (prevUser.updatedAt !== currentUser.updatedAt) {
                    this.setState({
                        pending: false,
                        succeeded: true,
                    });
                }
            }
            if (this.props.users.all.length > prevProps.users.all.length) {
                this.setState({
                    pending: false,
                    succeeded: true,
                });
            }
        }
        if (prefstate.roles.length !== this.state.roles.length) {
            if (this.state.roles) {
                const arrSelectable = [];
                // eslint-disable-next-line no-restricted-syntax
                for (const role of this.props.roles.all) {
                    if (!this.state.roles.find((item) => item._id === role._id)) arrSelectable.push(role);
                }
                this.setState({
                    selectableroles: arrSelectable,
                });
            }
        }
    }

    submit = (e) => {
        e.preventDefault();
        const data = JSON.parse(JSON.stringify(this.props.formData));
        if (this.state.roles.length) data.roles = this.state.roles;

        if (this.props.formData._id) {
            this.props.updateUser(data);
        } else {
            this.props.createUser(data);
        }
        this.setState({
            pending: true,
            succeeded: false,
        });
    }

    render() {
        const {
            classes,
        } = this.props;

        const {
            username, firstname, lastname, password, status, tenant,
        } = this.props.formData;
        return (
            <div className={classes.frame}>
                {this.props.users.error && (
                    <SnackBar
                        variant={'error'}
                        onClose={() => { this.props.clearError(); }}
                    >
                        {getMessage(this.props.users.error)}

                    </SnackBar>
                )}
                {this.state.succeeded && (
                    <SnackBar
                        variant={'success'}
                        onClose={() => {
                            this.setState({
                                succeeded: true,
                            });
                        }}
                    >
                        Success
                    </SnackBar>
                )}
                <form onSubmit={this.submit.bind(this)} className={classes.form}>
                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor="username">username</InputLabel>
                        <Input
                            required
                            inputProps={{
                                pattern: '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))@((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$',
                                type: 'email',
                            }}
                            id="username"
                            name="username"
                            onChange={this.props.setVal.bind(this, 'username')}
                            value={username || ''}
                            error={!this.props.isValid('username')}
                        />
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor="firstname">firstname</InputLabel>
                        <Input
                            required
                            id="firstname"
                            name="firstname"
                            onChange={this.props.setVal.bind(this, 'firstname')}
                            value={firstname || ''}
                            error={!this.props.isValid('firstname')}
                        />
                    </FormControl>

                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor="lastname">lastname</InputLabel>
                        <Input
                            required
                            id="lastname"
                            name="lastname"
                            onChange={this.props.setVal.bind(this, 'lastname')}
                            value={lastname || ''}
                            error={!this.props.isValid('lastname')}
                        />
                    </FormControl>

                    {
                        this.props.auth.isAdmin
                                && <FormControl className={classes.formControl}>
                                    <InputLabel htmlFor="tenant">tenant</InputLabel>
                                    <Select
                                        id='tenant'
                                        value={tenant || ''}
                                        onChange={this.props.setVal.bind(this, 'tenant')}
                                    >
                                        {this.props.tenants.all.map((item) => <MenuItem key={item._id} value={item}>{item.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                    }

                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor="roles">roles</InputLabel>
                        <Select
                            id='roles'
                            value={this.state.selectValue}
                            onChange={ (e) => {
                                this.setState({
                                    selectValue: e.target.value,
                                });
                            }
                            }
                        >
                            {this.state.selectableroles && this.state.selectableroles.map((item) => <MenuItem key={item._id} value={item}>{item.name}</MenuItem>)}
                        </Select>
                        <Button
                            type='button'
                            variant="contained"
                            onClick={ () => {
                                if (this.state.selectValue) {
                                    const tempArr = [...this.state.roles];
                                    tempArr.push(this.state.selectValue);
                                    this.setState({
                                        roles: tempArr,
                                        selectValue: '',
                                    });
                                }
                            }}>
                            <Add/>
                        </Button>
                    </FormControl>

                    {
                        this.state.roles.length
                            ? <List dense={true}>
                                {this.state.roles.map((item) => <ListItem key={item._id}>
                                    <ListItemText
                                        primary={item.name}
                                    />
                                    <Button
                                        type='button'
                                        variant="contained"
                                        onClick={ () => {
                                            const tempArr = [...this.state.roles];
                                            this.setState({
                                                roles: tempArr.filter((tempArrItem) => tempArrItem._id !== item._id),
                                            });
                                        }}>
                                        <Remove/>
                                    </Button>
                                </ListItem>)}
                            </List>

                            : null
                    }

                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor="status">status</InputLabel>
                        <Select
                            value={status || conf.account.status.ACTIVE}
                            onChange={this.props.setVal.bind(this, 'status')}
                        >
                            {Object.keys(conf.account.status).map((key_) => <MenuItem key={key_} value={key_}>{key_}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl className={classes.formControl}>
                        {!this.props.userId && (
                            <React.Fragment>
                                <InputLabel htmlFor="password">password</InputLabel>
                                <Input
                                    required
                                    id="password"
                                    type="password"
                                    name="password"
                                    onChange={this.props.setVal.bind(this, 'password')}
                                    value={password || ''}
                                />
                            </React.Fragment>

                        )}
                    </FormControl>

                    <FormControl className={classes.formControl}>
                        <Button
                            disabled={this.state.pending}
                            type='submit'
                            variant="contained"
                            color="secondary">{this.state.pending ? 'Saving...' : 'Save'}
                        </Button>
                    </FormControl>

                </form>
            </div>
        );
    }
}

const mapStateToProps = (state) => ({
    users: state.users,
    roles: state.roles,
    tenants: state.tenants,
    auth: state.auth,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    ...usersActions,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
    withSideSheet,
    withForm,
)(EditUser);
