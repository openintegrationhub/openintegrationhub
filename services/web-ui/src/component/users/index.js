import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import AddIcon from '@material-ui/icons/Add';

// Actions
import { Container } from '@material-ui/core';
import { getUsers } from '../../action/users';
import { getTenants } from '../../action/tenants';
import { getRoles } from '../../action/roles';

// components
import Table from '../table';
import EditUser from '../edit-user';

const useStyles = {
    wrapper: {
        width: '100%',
        position: 'inherit',
    },
    tools: {
        padding: '10px 0 0 10px',
    },
};

class Users extends React.Component {
    state= {
        drawerIsOpen: false,
    }

    constructor(props) {
        super();
        props.getUsers();
        props.getRoles();
        props.getTenants();
    }

    editHandler = (userId) => {
        this.setState({
            drawerIsOpen: true,
            editUserId: userId,
        });
    };

    addUser = () => {
        this.setState({
            drawerIsOpen: true,
            editUserId: '',
        });
    };

    render() {
        const {
            classes,
        } = this.props;
        if (this.props.users && this.props.users.all.length) {
            return (
                <Container className={classes.wrapper}>
                    <Grid item xs={12} className={classes.tools}>
                        <Button variant="outlined" aria-label="Add" onClick={this.addUser}>
                            Add<AddIcon/>
                        </Button>
                    </Grid>
                    <Grid item xs={12}>
                        <EditUser
                            side={'right'}
                            open={this.state.drawerIsOpen}
                            userId={this.state.editUserId}
                            onClose={() => {
                                this.setState({
                                    drawerIsOpen: false,
                                });
                            }}
                        />
                        <Table data={this.props.users.all} editHandler={this.editHandler} type='user'/>
                    </Grid>

                </Container>
            );
        }
        return null;
    }
}

const mapStateToProps = (state) => ({
    users: state.users,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getUsers,
    getTenants,
    getRoles,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Users);
