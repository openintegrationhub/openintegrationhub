import React from 'react';
// Ui
import { makeStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';


const useStyles = makeStyles(() => ({
    root: {
        width: '100%',
    },
    heading: {
        fontSize: '0.9375rem',
        fontWeight: '400',
    },
}));

function FlowTeaser() {
    const classes = useStyles();
    return (
        <div className={classes.root}>
            <Grid item xs={12}>
                <ExpansionPanel>
                    <ExpansionPanelSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <Typography className={classes.heading}>{this.props.data.name}</Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Typography>
            Flow Data here
                        </Typography>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            </Grid>
        </div>
    );
}


export default FlowTeaser;
