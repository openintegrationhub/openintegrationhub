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
import Modal from '@material-ui/core/Modal';


// Domain
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';

// Actions
import {
    updateDomain, deleteDomain,
} from '../../../action/metadata';

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

class MetaDataTeaser extends React.PureComponent {
    state= {
        editDomain: false,
        editorData: null,
    }

    getDist() {
        return this.props.data.distribution && <Grid container>
            <Grid item xs={8}><InputLabel>image:</InputLabel><Typography>{this.props.data.distribution.image}</Typography></Grid>
            <Grid item xs={4}><InputLabel>type:</InputLabel><Typography>{this.props.data.distribution.type}</Typography></Grid>
        </Grid>;
    }

    editOpen= () => {
        this.setState({
            editDomain: true,
        });
    }

    deleteDomain = () => {
        this.props.deleteDomain(this.props.data.id);
    }

    updateDomain = () => {
        this.props.updateDomain(this.state.editorData);
        this.setState({
            editDomain: false,
        });
    }

    editorChange(e) {
        if (!e.error) {
            this.setState({
                editorData: e.jsObject,
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
                            <Grid item xs={3}><InputLabel>Name:</InputLabel><Typography >{this.props.data.name}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Description:</InputLabel><Typography >{this.props.data.description}</Typography></Grid>
                        </Grid>

                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Grid container>
                            {/* <Grid item xs={12}><h3>Distribution</h3>
                                {
                                    this.getDist()
                                }
                            </Grid> */}
                            <Grid item xs={12}><h3>Schemas</h3></Grid>

                            <Grid item xs={12}>
                                <Button variant="outlined" aria-label="next" onClick={this.editOpen}>
                                    Update
                                </Button>
                                <Button variant="outlined" aria-label="next" onClick={this.deleteDomain}>
                                    Delete
                                </Button>
                            </Grid>
                        </Grid>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.editDomain}
                    onClose={ () => { this.setState({ editDomain: false }); }}
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
                        <Button variant="outlined" aria-label="Add" onClick={this.updateDomain}>
                            Save
                        </Button>
                    </div>

                </Modal>
            </Grid>
        );
    }
}

const mapStateToProps = state => ({
    metadata: state.metadata,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    deleteDomain,
    updateDomain,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(MetaDataTeaser);
