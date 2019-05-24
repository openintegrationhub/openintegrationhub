import React from 'react';
import { withStyles } from '@material-ui/styles';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import FormLabel from '@material-ui/core/FormLabel';
import FormGroup from '@material-ui/core/FormGroup';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import withSideSheet from '../../hoc/with-side-sheet';
import withForm from '../../hoc/with-form';
import { updateUser } from '../../action/users';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
    form: {
        float: 'none',
        margin: 'auto',
        padding: '40vh 0',
        width: 200,
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
            const currentUser = this.props.users.find(user => user._id === this.props.userId);
            this.props.setFormData({
                _id: this.props.userId,
                username: currentUser.username,
                firstname: currentUser.firstname,
                lastname: currentUser.lastname,
            });
        }
    }

    submit = (e) => {
        e.preventDefault();
        this.props.updateUser(this.props.formData);
    }

    render() {
        const {
            classes,
        } = this.props;

        const { username, firstname, lastname } = this.props.formData;
        return (
            <div className={classes.frame}>
                <form onSubmit={this.submit.bind(this)} className={classes.form}>
                    <FormGroup className={classes.formGroup}>
                        <FormLabel htmlFor="username">username</FormLabel>
                        <Input id="username" name="username" onChange={this.props.setVal.bind(this, 'username')} value={username || ''} />
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <FormLabel htmlFor="username">firstname</FormLabel>
                        <Input id="username" name="username" onChange={this.props.setVal.bind(this, 'firstname')} value={firstname || ''} />
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <FormLabel htmlFor="username">lastname</FormLabel>
                        <Input id="username" name="username" onChange={this.props.setVal.bind(this, 'lastname')} value={lastname || ''} />
                    </FormGroup>
                    <FormGroup className={classes.formGroup}>
                        <Button type='submit' variant="contained" color="secondary">Login</Button>
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
    updateUser,
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
