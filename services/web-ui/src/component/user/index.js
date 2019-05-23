import React from 'react';
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';

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

class User extends React.Component {
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

export default flow(
    withStyles(useStyles),
)(User);
