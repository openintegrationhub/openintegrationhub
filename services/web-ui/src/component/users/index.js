import React from 'react';
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { getUsers } from '../../action/users';


const useStyles = {
    loginContainer: {
        flexGrow: 1,
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

class Users extends React.Component {
    constructor(props) {
        super();
        props.getUsers();
    }

    render() {
        const { classes } = this.props;
        return (
            <div className={classes.loginContainer}>
                <Grid container >
                    <Grid item xs={4}></Grid>
                    <Grid item xs={4}>
                        <div className={classes.frame}>
                            adsfsdf
                        </div>
                    </Grid>
                    <Grid item xs={4}></Grid>
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
