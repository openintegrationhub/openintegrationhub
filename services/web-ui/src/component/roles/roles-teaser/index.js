import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import {
    Select, TextField, Button, Grid, MenuItem, List, ListItem, ListItemText,
} from '@material-ui/core';
import { withStyles } from '@material-ui/styles';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import InputLabel from '@material-ui/core/InputLabel';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Modal from '@material-ui/core/Modal';

import {
    Delete, Edit, Add, Remove,
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
    textField: {
        width: 200,
    },
    form: {
        display: 'flex',
        flexWrap: 'wrap',
        width: 500,
        backgroundColor: 'white',
        justifyContent: 'center',
        margin: 'auto',
        outline: 'none',
    },
    select: {
        width: '80%',
    },
};

class RolesTeaser extends React.PureComponent {
    state= {
        editRole: false,
        global: false,
        name: '',
        permission: '',
        selectedPermissions: [],
    }

    componentDidMount() {
        if (this.props.data.permissions.length) {
            console.log(this.props.data.permissions);
            this.setState({
                selectedPermissions: this.props.data.permissions,
            });
        }
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
        this.props.updateRole({
            name: this.state.name,
            permission: this.state.selectedPermissions,
        });
        this.setState({
            editRole: false,
        });
    }

    setName(e) {
        if (!e.error) {
            this.setState({
                name: {
                    name: e.target.value,
                },
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
                                        name: this.props.data.name,
                                        selectedPermissions: this.props.data.permissions,
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
                    <form className={classes.form}>
                        <Grid item xs={8}>

                            <TextField
                                id="standard-name"
                                label="Name"
                                className={classes.textField}
                                onChange={this.setName.bind(this)}
                                margin="normal"
                                value={this.props.data.name}
                            />


                        </Grid>
                        <Grid item xs={8}>

                            <Select
                                className={classes.select}
                                value={this.state.permission}
                                onChange={ (e) => {
                                    this.setState({
                                        permission: e.target.value,
                                    });
                                }
                                }
                            >
                                {this.props.roles && this.props.roles.permissions.map((item, index) => <MenuItem key={`selectPermissions${index}`} value={item}>{item}</MenuItem>)}
                            </Select>
                            <Button
                                type='button'
                                onClick={ () => {
                                    const tempArr = [...this.state.permissions];
                                    tempArr.push(this.state.permission);
                                    this.setState({
                                        selectedPermissions: tempArr,
                                        permission: '',
                                    });
                                }}>
                                <Add/>
                            </Button>

                            <Grid item xs={8}>
                                {
                                    this.state.selectedPermissions.length
                                        ? <List dense={true}>
                                            {this.state.selectedPermissions.map((item, index) => <ListItem key={`listPermissions${index}`}>
                                                <ListItemText
                                                    primary={item}
                                                />
                                                <Button
                                                    type='button'
                                                    variant="contained"
                                                    onClick={ () => {
                                                        const tempArr = [...this.state.selectedPermissions];
                                                        this.setState({
                                                            selectedPermissions: tempArr.filter(tempArrItem => tempArrItem._id !== item._id),
                                                        });
                                                    }}>
                                                    <Remove/>
                                                </Button>
                                            </ListItem>)}
                                        </List>

                                        : null
                                }
                            </Grid>
                        </Grid>

                        <Grid item xs={8}>
                            <Button variant="outlined" aria-label="Add" onClick={this.updateRole}>
                            Save
                            </Button>
                            <Button variant="outlined" aria-label="Add" onClick={(e) => {
                                e.preventDefault();
                                this.setState({ editRole: false });
                            }}>
                            close
                            </Button>
                        </Grid>
                    </form>
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
