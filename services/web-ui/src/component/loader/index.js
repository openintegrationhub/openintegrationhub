import React from 'react';
import flow from 'lodash/flow';
// UI
import { withStyles } from '@material-ui/styles';
import CircularProgress from '@material-ui/core/CircularProgress';

const useStyles = {
    loginContainer: {
        flexGrow: 1,
    },
    loading: {
        padding: '40vh 0',
        height: '100vh',
    },
};

class Loader extends React.Component {
    render() {
        const { classes } = this.props;
        return (
            <div className={classes.loginContainer}>
                <div className={classes.loading}>
                    <CircularProgress size={200} color="secondary" style={{ marginLeft: '45%' }}/>
                </div>

            </div>
        );
    }
}

export default flow(
    withStyles(useStyles),
)(Loader);
