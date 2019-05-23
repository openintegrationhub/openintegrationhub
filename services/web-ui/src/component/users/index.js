import React from 'react';
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { getUsers } from '../../action/users';


// components
import Table from '../user-table';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
};

class Users extends React.Component {
    constructor(props) {
        super();
        props.getUsers();
    }

    render() {
        const {
            classes,
        } = this.props;
        return (
            <div className={classes.wrapper}>
                <Grid container >
                    <Grid item xs={12}>
                        <Table users={this.props.users}/>
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
