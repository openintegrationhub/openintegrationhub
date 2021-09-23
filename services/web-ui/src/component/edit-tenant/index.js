import React from 'react';
import { withStyles } from '@material-ui/styles';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// UI
import FormControl from '@material-ui/core/FormControl';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Select from '@material-ui/core/Select';
import { People } from '@material-ui/icons';
// actions and stuff
import withSideSheet from '../../hoc/with-side-sheet';
import withForm from '../../hoc/with-form';
import * as tenantsActions from '../../action/tenants';
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

class EditTenant extends React.Component {
    state = {
        pending: false,
        succeeded: false,
        tenantMembers: [],
    }

    componentDidMount() {
        if (this.props.tenantId) {
            const currentTenant = this.props.tenants.all.find((tenant) => tenant._id === this.props.tenantId);
            this.props.setFormData({
                _id: this.props.tenantId,
                name: currentTenant.name,
                status: currentTenant.status,
            });
        } else {
            this.props.setFormData({
                name: '',
                status: conf.tenant.status.ACTIVE,
            });
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.tenants.error && !prevProps.tenants.error) {
            this.setState({
                pending: false,
                succeeded: false,
            });
            return;
        }
        if (this.state.pending) {
            if (this.props.tenantId) {
                const prevTenant = prevProps.tenants.all.find((tenant) => tenant._id === prevProps.tenantId);
                const currentTenant = this.props.tenants.all.find((tenant) => tenant._id === this.props.tenantId);
                if (prevTenant.updatedAt !== currentTenant.updatedAt) {
                    this.setState({
                        pending: false,
                        succeeded: true,
                    });
                }
            }
            if (this.props.tenants.all.length > prevProps.tenants.all.length) {
                this.setState({
                    pending: false,
                    succeeded: true,
                });
            }
        }
    }

    submit = (e) => {
        e.preventDefault();
        if (this.props.formData._id) {
            this.props.updateTenant(this.props.formData);
        } else {
            this.props.createTenant(this.props.formData);
        }
        this.setState({
            pending: true,
            succeeded: false,
        });
    }

    generateMembers = () => {
        this.state.tenantMembers.map((member) => <ListItem key={`member-${member._id}`}>
            <ListItemIcon>
                <People />
            </ListItemIcon>
            <ListItemText
                primary={member.name}
            />
        </ListItem>);
    }

    render() {
        const {
            classes,
        } = this.props;

        const {
            name, status,
        } = this.props.formData;
        return (
            <div className={classes.frame}>
                {this.props.tenants.error && (
                    <SnackBar
                        variant={'error'}
                        onClose={() => { this.props.clearError(); }}
                    >
                        {getMessage(this.props.tenants.error)}

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
                        <InputLabel htmlFor="name">name</InputLabel>
                        <Input
                            required
                            id="name"
                            name="name"
                            onChange={this.props.setVal.bind(this, 'name')}
                            value={name || ''}
                            error={!this.props.isValid('name')}
                        />
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor="role">status</InputLabel>
                        <Select
                            value={status || conf.tenant.status.ACTIVE}
                            onChange={this.props.setVal.bind(this, 'status')}
                        >
                            {Object.keys(conf.tenant.status).map((key_) => <MenuItem key={key_} value={key_}>{key_}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <div className={classes.demo}>
                            <List>
                                {this.generateMembers()}
                            </List>
                        </div>
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
    tenants: state.tenants,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    ...tenantsActions,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
    withSideSheet,
    withForm,
)(EditTenant);
