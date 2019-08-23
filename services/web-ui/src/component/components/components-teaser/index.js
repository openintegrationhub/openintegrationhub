import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
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
import Modal from '@material-ui/core/Modal';
import {
    AddBox,
} from '@material-ui/icons';


// Componente
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';

// Actions
import {
    deleteComponent, updateComponent,
} from '../../../action/components';

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

class ComponentTeaser extends React.PureComponent {
    state= {
        editComponent: false,
        editorData: null,
        wasChanged: false,
    }

    getDist() {
        return this.props.data.distribution && <Grid container>
            <Grid item xs={8}><InputLabel>image:</InputLabel><Typography>{this.props.data.distribution.image}</Typography></Grid>
            <Grid item xs={4}><InputLabel>type:</InputLabel><Typography>{this.props.data.distribution.type}</Typography></Grid>
        </Grid>;
    }

    getTrigger(data) {
        return (
            Object.keys(data).map((key, index) => (<ExpansionPanel key={`triggers-${index}`} expandicon={<ExpandMoreIcon />}>
                <ExpansionPanelSummary>
                    <Grid container>
                        <Grid item xs={3}><InputLabel>Trigger:</InputLabel><Typography >{key}</Typography></Grid>
                    </Grid>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Grid container spacing={2}>
                        <Grid item xs={5}><InputLabel>Title:</InputLabel><Typography >{data[key].title}</Typography></Grid>
                        <Grid item xs={5}><InputLabel>Description:</InputLabel><Typography >{data[key].description}</Typography></Grid>
                        <Grid item xs={2}><InputLabel>Type:</InputLabel><Typography >{data[key].type}</Typography></Grid>
                    </Grid>
                </ExpansionPanelDetails>
            </ExpansionPanel>))

        );
    }

    getActions(data) {
        return (
            Object.keys(data).map((key, index) => (<ExpansionPanel key={`actions-${index}`} expandicon={<ExpandMoreIcon />}>
                <ExpansionPanelSummary>
                    <Grid container>
                        <Grid item xs={3}><InputLabel>Action:</InputLabel><Typography >{key}</Typography></Grid>
                    </Grid>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <Grid container spacing={2}>
                        <Grid item xs={4}><InputLabel>Title:</InputLabel><Typography >{data[key].title}</Typography></Grid>
                        <Grid item xs={4}><InputLabel>Description:</InputLabel><Typography >{data[key].description}</Typography></Grid>
                    </Grid>
                </ExpansionPanelDetails>
            </ExpansionPanel>))

        );
    }

    editOpen= () => {
        this.setState({
            editComponent: true,
        });
    }

    deleteComponent = () => {
        this.props.deleteComponent(this.props.data.id);
    }

    updateComponent = () => {
        if (this.state.wasChanged) {
            this.props.updateComponent(this.state.editorData);
            this.setState({
                editComponent: false,
                wasChanged: false,
            });
        }
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.jsObject,
                wasChanged: true,
            });
        }
    }

    render() {
        const {
            classes,
        } = this.props;
        return (
            <Grid item xs={12}>
                <ExpansionPanel>
                    <ExpansionPanelSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >

                        <Grid container>
                            {
                                this.props.data.logo
                                    ? <Grid item xs={1}>
                                        <img src={this.props.data.logo} alt="Smiley face" height="42" width="42"/>
                                    </Grid>

                                    : <Grid item xs={1}>
                                        <AddBox style={{ height: '42', width: '42' }}/>
                                    </Grid>
                            }
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Description:</InputLabel><Typography >{this.props.data.description}</Typography></Grid>
                        </Grid>

                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Grid container>

                            {
                                this.props.data.descriptor && Object.prototype.hasOwnProperty.call(this.props.data.descriptor, 'triggers')
                                    && (
                                        <Grid item xs={12}><h3>Triggers</h3>
                                            {this.getTrigger(this.props.data.descriptor.triggers)}
                                        </Grid>
                                    )
                            }


                            {
                                this.props.data.descriptor && Object.prototype.hasOwnProperty.call(this.props.data.descriptor, 'actions')
                                    && (
                                        <Grid item xs={12}><h3>Actions</h3>
                                            {this.getActions(this.props.data.descriptor.actions)}
                                        </Grid>
                                    )
                            }

                            <Grid item xs={12}><h3>Distribution</h3>
                                {
                                    this.getDist()
                                }
                            </Grid>
                            <Grid item xs={12}><h3>Meta</h3></Grid>
                            <Grid item xs={3}><InputLabel>Created:</InputLabel><Typography>{moment(this.props.data.createdAt).format('HH:mm:ss DD.MM.YYYY')}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Updated:</InputLabel><Typography >{moment(this.props.data.updatedAt).format('HH:mm:ss DD.MM.YYYY')}</Typography></Grid>
                            <Grid item xs={12}>
                                <Button variant="outlined" aria-label="next" onClick={this.editOpen}>
                                    Update
                                </Button>
                                <Button variant="outlined" aria-label="next" onClick={this.deleteComponent}>
                                    Delete
                                </Button>
                            </Grid>
                        </Grid>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.editComponent}
                    onClose={ () => { this.setState({ editComponent: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <JSONInput
                            id = 'jsonEdit'
                            locale = {locale}
                            theme = 'dark_vscode_tribute'
                            placeholder = {this.props.data}
                            height = '550px'
                            width = '600px'
                            onChange={this.editorChange.bind(this)}
                        />
                        <Button variant="outlined" aria-label="Add" onClick={() => { this.setState({ editComponent: false }); }}>
                            close
                        </Button>
                        <Button variant="outlined" aria-label="Add" onClick={this.updateComponent} disabled={!this.state.wasChanged}>
                            Save
                        </Button>
                    </div>

                </Modal>
            </Grid>
        );
    }
}

const mapStateToProps = state => ({
    components: state.components,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    deleteComponent,
    updateComponent,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(ComponentTeaser);
