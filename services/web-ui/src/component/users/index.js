import React from 'react';
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { getUsers } from '../../action/users';
import EditUser from '../edit-user';


// components
import Table from '../table';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
};

class Users extends React.Component {
    state= {
        editUserIsOpen: false,
    }

    constructor(props) {
        super();
        props.getUsers();
    }

    editHandler = (userId) => {
        this.setState({
            editUserIsOpen: true,
            editUserId: userId,
        });
    };

    render() {
        const {
            classes,
        } = this.props;
        return (
            <div className={classes.wrapper}>
                <Grid container >
                    <Grid item xs={12}>
                        <EditUser
                            side={'right'}
                            open={this.state.editUserIsOpen}
                            userId={this.state.editUserId}
                            onClose={() => {
                                this.setState({
                                    editUserIsOpen: false,
                                });
                            }}
                        />
                        <Table data={this.props.users} editHandler={this.editHandler}/>
                    </Grid>
                </Grid>

            </div>
        );
    }
}

const mapStateToProps = state => ({
    users: state.users,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getUsers,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Users);
