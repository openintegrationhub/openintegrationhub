import React from 'react';
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import flow from 'lodash/flow';

// components
import Table from '../user-table';


const useStyles = {
    wrapper: {
        width: '100%',
        padding: '10vh 0 0 0',
    },
};

class User extends React.Component {
    render() {
        const {
            classes,
        } = this.props;
        return (
            <div className={classes.wrapper}>
                <Grid container >
                    <Grid item xs={12}>
                        <Table />
                    </Grid>
                </Grid>

            </div>
        );
    }
}

export default flow(
    withStyles(useStyles),
)(User);
