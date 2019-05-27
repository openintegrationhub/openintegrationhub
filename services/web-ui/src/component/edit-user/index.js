import React from 'react';
import { withStyles } from '@material-ui/styles';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
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
    formGroup: {
        padding: '30px 0 0 0 ',
    },
};

class EditUser extends React.Component {
    state = {
        pending: false,
    }

    componentDidMount() {
        if (this.props.userId) {
            const currentUser = this.props.users.all.find(user => user._id === this.props.userId);
            this.props.setFormData({
                _id: this.props.userId,
                username: currentUser.username,
                firstname: currentUser.firstname,
                lastname: currentUser.lastname,
                role: currentUser.role,
                password: '',
            });
        } else {
            this.props.setFormData({
                username: '',
                firstname: '',
                lastname: '',
                role: '',
                password: '',
            });
        }
    }

    componentDidUpdate(prevProps) {
        if (this.state.pending) {
            if (this.props.userId) {
                const prevUser = prevProps.users.all.find(user => user._id === prevProps.userId);
                const currentUser = this.props.users.all.find(user => user._id === this.props.userId);
                if (prevUser.updatedAt !== currentUser.updatedAt) {
                    this.setState({
                        pending: false,
                    });
                }
            }
            if (this.props.users.all.length > prevProps.users.all.length) {
                this.setState({
                    pending: false,
                });
            }
        }
    }

    submit = (e) => {
        e.preventDefault();
        if (this.props.formData._id) {
            this.props.updateUser(this.props.formData);
        } else {
            this.props.createUser(this.props.formData);
        }
        this.setState({
            pending: true,
        });
    }

    render() {
        const {
            classes,
        } = this.props;

        const {
            username, firstname, lastname, password, role, status,
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
                <form onSubmit={this.submit.bind(this)} className={classes.form}>
                    <FormGroup className={classes.formGroup}>
                        <FormLabel htmlFor="username">username</FormLabel>
                        <Input id="username" name="username" onChange={this.props.setVal.bind(this, 'username')} value={username || ''} />
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <FormLabel htmlFor="firstname">firstname</FormLabel>
                        <Input id="firstname" name="firstname" onChange={this.props.setVal.bind(this, 'firstname')} value={firstname || ''} />
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <FormLabel htmlFor="lastname">lastname</FormLabel>
                        <Input id="lastname" name="lastname" onChange={this.props.setVal.bind(this, 'lastname')} value={lastname || ''} />
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <InputLabel htmlFor="role">role</InputLabel>
                        <Select
                            value={role || conf.account.roles.USER}
                            onChange={this.props.setVal.bind(this, 'role')}
                        >
                            {Object.keys(conf.account.roles).map(key_ => <MenuItem key={key_} value={key_}>{key_}</MenuItem>)}
                        </Select>
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <InputLabel htmlFor="role">status</InputLabel>
                        <Select
                            value={status || conf.account.status.ACTIVE}
                            onChange={this.props.setVal.bind(this, 'status')}
                        >
                            {Object.keys(conf.account.status).map(key_ => <MenuItem key={key_} value={key_}>{key_}</MenuItem>)}
                        </Select>
                    </FormGroup>
                    {!this.props.userId && (
                        <FormGroup className={classes.formGroup}>
                            <FormLabel htmlFor="username">password</FormLabel>
                            <Input id="password" type="password" name="password" onChange={this.props.setVal.bind(this, 'password')} value={password || ''} />
                        </FormGroup>
                    )}

                    <FormGroup className={classes.formGroup}>
                        <Button
                            disabled={this.state.pending}
                            type='submit'
                            variant="contained"
                            color="secondary">{this.state.pending ? 'Saving...' : 'Save'}
                        </Button>
                    </FormGroup>
                </form>
            </div>
        );
    }
}

const mapStateToProps = state => ({
    users: state.users,
});
const mapDispatchToProps = dispatch => bindActionCreators({
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
