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

import {
    Delete, Edit,
} from '@material-ui/icons';


// Actions
import {
    deleteRole, updateRole,
} from '../../../action/roles';

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

class RolesTeaser extends React.PureComponent {
    state= {
        editRole: false,
        editorData: null,
    }

    editOpen= () => {
        this.setState({
            editRole: true,
        });
    }

    deleteRole = () => {
        this.props.deleteRole(this.props.data._id);
    }

    updateRole = () => {
        this.props.updateRole(this.state.editorData);
        this.setState({
            editRole: false,
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
                            <Grid item xs={7}><InputLabel>isGlobal:</InputLabel><Typography >{this.props.data.isGlobal.toString()}</Typography></Grid>
                            <Grid item xs={2}>
                                <Button variant="outlined" aria-label="next" onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    this.setState({
                                        editRole: true,
                                        editorData: this.props.data,
                                    });
                                }}>
                                    <Edit/>
                                </Button>
                                <Button variant="outlined" aria-label="next" onClick={this.deleteRole}>
                                    <Delete/>
                                </Button>
                            </Grid>
                        </Grid>

                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>
                        <Grid container>
                            <Grid item xs={3}><InputLabel>Permissions:</InputLabel><Typography >{this.props.data.permissions}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Created:</InputLabel><Typography>{this.props.data.createdAt}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Updated:</InputLabel><Typography >{this.props.data.updatedAt}</Typography></Grid>

                        </Grid>
                    </ExpansionPanelDetails>
                </ExpansionPanel>
                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.editRole}
                    onClose={ () => { this.setState({ editRole: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <Button variant="outlined" aria-label="Add" onClick={this.updateRole}>
                            Save
                        </Button>
                        <Button variant="outlined" aria-label="Add" onClick={() => { this.setState({ editRole: false }); }}>
                            close
                        </Button>
                    </div>

                </Modal>
            </Grid>
        );
    }
}

const mapStateToProps = state => ({
    roles: state.roles,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    deleteRole,
    updateRole,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(RolesTeaser);
