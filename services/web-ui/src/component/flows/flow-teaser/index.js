import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
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

// Actions
import { deleteFlow } from '../../../action/flows';

const useStyles = {
    heading: {
        fontSize: '0.9375rem',
        fontWeight: '400',
    },
};

class FlowTeaser extends React.PureComponent {
    getNodes() {
        return this.props.data.graph.nodes && this.props.data.graph.nodes.map(node => <Grid container key={`node-${node.id}`}>
            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography>{node.name}</Typography></Grid>
            <Grid item xs={3}><InputLabel>Description:</InputLabel><Typography>{node.description}</Typography></Grid>
            <Grid item xs={3}><InputLabel>Command:</InputLabel><Typography>{node.command}</Typography></Grid>
        </Grid>);
    }

    getEdges() {
        return this.props.data.graph.edges && this.props.data.graph.edges.map(node => <Grid container key={`node-${node.id}`}>
            <Grid item xs={3}><InputLabel>Source:</InputLabel><Typography>{node.source}</Typography></Grid>
            <Grid item xs={3}><InputLabel>Target:</InputLabel><Typography>{node.target}</Typography></Grid>
            <Grid item xs={3}><InputLabel>Condition:</InputLabel><Typography>{node.config ? node.config.condition : ''}</Typography></Grid>
        </Grid>);
    }

    deleteFlow = () => {
        this.props.deleteFlow(this.props.data.id);
    }

    render() {
        // const {
        //     classes,
        // } = this.props;
        return (
            <Grid item xs={12}>
                <ExpansionPanel>
                    <ExpansionPanelSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >

                        <Grid container>
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Description:</InputLabel><Typography >{this.props.data.description}</Typography></Grid>
                            {this.props.data.status && <Grid item xs={3}><InputLabel>Status:</InputLabel><Typography >{this.props.data.status}</Typography></Grid>}
                        </Grid>

                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Grid container>
                            <Grid item xs={12}><h3>Nodes</h3>
                                {
                                    this.props.data.graph && this.getNodes()
                                }
                            </Grid>
                            <Grid item xs={12}><h3>Edges</h3>
                                {
                                    this.props.data.graph && this.getEdges()
                                }
                            </Grid>
                            <Grid item xs={12}><h3>Meta</h3></Grid>
                            <Grid item xs={3}><InputLabel>Type:</InputLabel><Typography >{this.props.data.type}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Created:</InputLabel><Typography>{this.props.data.createdAt}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Updated:</InputLabel><Typography >{this.props.data.updatedAt}</Typography></Grid>
                            <Grid item xs={12}>
                                <Button variant="outlined" aria-label="next" onClick={this.deleteFlow}>
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

const mapStateToProps = state => ({
    flows: state.flows,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    deleteFlow,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(FlowTeaser);
