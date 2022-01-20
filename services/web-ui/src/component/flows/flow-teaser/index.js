import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import Button from '@material-ui/core/Button';
import InputLabel from '@material-ui/core/InputLabel';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Modal from '@material-ui/core/Modal';
import {
    Delete, Edit, PlayArrow, Stop, Send,
} from '@material-ui/icons';

// Componente
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
// Diagram
import { Link } from 'react-router-dom';
import FlowGraph from '../flow-graph';
// Actions
import {
    deleteFlow, updateFlow, startFlow, stopFlow, executeFlow,
} from '../../../action/flows';

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
    indicator: {
        height: '10px',
        width: '10px',
        borderRadius: '50%',
        display: 'inline-block',
    },
};

class FlowTeaser extends React.PureComponent {
    state = {
        editFlow: false,
        editorData: null,
    }

    editOpen = (e) => {
        e.stopPropagation();
        this.setState({
            editFlow: true,
        });
    }

    deleteFlow = (e) => {
        e.stopPropagation();
        this.props.deleteFlow(this.props.data.id);
    }

    startFlow = (e) => {
        e.stopPropagation();
        this.props.startFlow(this.props.data.id);
    }

    stopFlow = (e) => {
        e.stopPropagation();
        this.props.stopFlow(this.props.data.id);
    }

    updateFlow = () => {
        this.props.updateFlow(this.state.editorData);
        this.setState({
            editFlow: false,
        });
    }

    executeFlow = (e) => {
        e.stopPropagation();
        this.props.executeFlow(this.props.data.id, {
            foo: 'bar',
        });
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.jsObject,
            });
        }
    }

    getStatus(classes) {
        switch (this.props.data.status) {
        case 'starting':
            return <span className={classes.indicator} style={{ backgroundColor: 'yellow' }} />;
        case 'stopping':
            return <span className={classes.indicator} style={{ backgroundColor: 'red' }} />;
        case 'active':
            return <span className={classes.indicator} style={{ backgroundColor: 'green' }} />;
        case 'inactive':
            return <span className={classes.indicator} style={{ backgroundColor: 'grey' }} />;
        default:
            return null;
        }
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Grid item xs={12}>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >

                        <Grid container>
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography><Typography>{this.props.data.id}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Description:</InputLabel><Typography >{this.props.data.description}</Typography></Grid>
                            {this.props.data.status
                                && <Grid item xs={2}><InputLabel>Status:</InputLabel><Typography >{this.getStatus(classes)} {this.props.data.status}</Typography></Grid>}
                            <Grid item xs={4}>
                                <Link to={`/flows/${this.props.data.id}`}><Button aria-label="next" onClick={() => this.openDetailPage(this.props.data.id)}>
                                    <Edit />
                                </Button></Link>

                                <Button aria-label="next" onClick={this.editOpen}>
                                    <Edit />
                                </Button>
                                <Button aria-label="next" onClick={this.deleteFlow}>
                                    <Delete />
                                </Button>
                                <Button aria-label="next" onClick={this.startFlow}>
                                    <PlayArrow />
                                </Button>
                                <Button aria-label="next" onClick={this.stopFlow}>
                                    <Stop />
                                </Button>
                                {this.props.data.status === 'active' && !this.props.data.cron
                                    && <Button aria-label="next" onClick={this.executeFlow}>
                                        <Send />
                                    </Button>}
                            </Grid>
                        </Grid>

                    </AccordionSummary>
                    <AccordionSummary>
                        <Grid container>
                            {/* <Grid item xs={12}><h3>Nodes</h3>
                                {
                                    this.props.data.graph && this.getNodes()
                                }
                            </Grid>
                            <Grid item xs={12}><h3>Edges</h3>
                                {
                                    this.props.data.graph && this.getEdges()
                                }
                            </Grid> */}

                            <Grid item xs={12}>
                                <FlowGraph
                                    width={1080}
                                    height={300}
                                    name={this.props.data.name}
                                    id={this.props.data.id}
                                    data={{
                                        nodes: this.props.data.graph.nodes,
                                        links: this.props.data.graph.edges,
                                    }}

                                />
                            </Grid>
                            <Grid item xs={12}><h3>Meta</h3></Grid>
                            <Grid item xs={3}><InputLabel>Type:</InputLabel><Typography >{this.props.data.type}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Created:</InputLabel><Typography>{moment(this.props.data.createdAt).format('HH:mm:ss DD.MM.YYYY')}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Updated:</InputLabel><Typography >{moment(this.props.data.updatedAt).format('HH:mm:ss DD.MM.YYYY')}</Typography></Grid>
                        </Grid>
                    </AccordionSummary>
                </Accordion>
                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.editFlow}
                    onClose={() => { this.setState({ editFlow: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <JSONInput
                            id='jsonEdit'
                            locale={locale}
                            theme='dark_vscode_tribute'
                            placeholder={this.props.data}
                            height='550px'
                            width='600px'
                            onChange={this.editorChange.bind(this)}
                        />
                        <Button variant="outlined" aria-label="Add" onClick={() => { this.setState({ editFlow: false }); }}>
                            close
                        </Button>
                        <Button variant="outlined" aria-label="Add" onClick={this.updateFlow}>
                            Save
                        </Button>
                    </div>

                </Modal>
            </Grid>
        );
    }
}

const mapStateToProps = (state) => ({
    flows: state.flows,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    deleteFlow,
    updateFlow,
    startFlow,
    stopFlow,
    executeFlow,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(FlowTeaser);
