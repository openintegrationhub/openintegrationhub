import React from 'react';
import flow from 'lodash/flow';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Button from '@material-ui/core/Button';
import InputLabel from '@material-ui/core/InputLabel';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import {
    Flare,
    Code,
} from '@material-ui/icons';
import { getConfig } from '../../../conf';

const conf = getConfig();
const useStyles = {
    heading: {
        fontSize: '0.9375rem',
        fontWeight: '400',
    },
    modal: {
        backgroundColor: 'white',
        margin: 'auto',
        outline: 'none',
    },
};


const TYPE_MAP = {
    OA2_AUTHORIZATION_CODE: 'oAuth2',
    MIXED: 'Mixed',
};
class SecretTeaser extends React.PureComponent {
    state = {
        editComponent: false,
        editorData: null,
        wasChanged: false,
    }

    editOpen = () => {
        this.setState({
            editComponent: true,
        });
    }

    render() {
        const template = (() => {
            switch (this.props.data.type) {
            case conf.secret.type.OA2_AUTHORIZATION_CODE:
                return (
                    < React.Fragment >
                        <Grid container>
                            {
                                this.props.data.logo
                                    ? <Grid item xs={1}>
                                        <img src={this.props.provider.logo} alt="Smiley face" height="42" width="42" />
                                    </Grid>

                                    : <Grid item xs={1}>
                                        <Flare style={{ height: '42', width: '42' }} />
                                    </Grid>
                            }
                            <Grid item xs={3}><InputLabel>Id:</InputLabel><Typography >{this.props.data._id}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Provider:</InputLabel><Typography >{this.props.provider.name}</Typography></Grid>
                            <Grid item xs={2}><InputLabel>Type:</InputLabel><Typography >{TYPE_MAP[this.props.data.type]}</Typography></Grid>
                        </Grid>
                    </React.Fragment >
                );
            case conf.secret.type.MIXED:
                return (
                    <React.Fragment>
                        <Grid container>
                            {
                                this.props.data.logo
                                    ? <Grid item xs={1}>
                                        <img src={this.props.provider.logo} alt="Smiley face" height="42" width="42" />
                                    </Grid>

                                    : <Grid item xs={1}>
                                        <Code style={{ height: '42', width: '42' }} />
                                    </Grid>
                            }
                            <Grid item xs={3}><InputLabel>Id:</InputLabel><Typography >{this.props.data._id}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Type:</InputLabel><Typography >{TYPE_MAP[this.props.data.type]}</Typography></Grid>
                        </Grid>
                    </React.Fragment>
                );
            default:
                return (
                    <React.Fragment>
                    </React.Fragment>
                );
            }
        })();

        return (
            <Grid item xs={12}>
                <ExpansionPanel>
                    <ExpansionPanelSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >

                        {template}
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Grid container>
                            <Grid item xs={12}>
                                <Button variant="outlined" aria-label="next" onClick={this.props.deleteSecret}>
                                    Delete
                                </Button>
                            </Grid>
                        </Grid>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
            </Grid>
        );
    }
}

export default flow(
    withStyles(useStyles),
)(SecretTeaser);
