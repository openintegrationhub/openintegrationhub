import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import {
    Select, TextField, Button, Grid, MenuItem, List, ListItem, ListItemText,
} from '@material-ui/core';
import { withStyles } from '@material-ui/styles';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
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
    textField: {
        width: 200,
    },
};

class RolesTeaser extends React.PureComponent {
    state= {
        editRole: false,
        name: '',
        permission: '',
        selectedPermissions: [],
    }

    editOpen= () => {
        this.setState({
            editRole: true,
        });
    }

    deleteRole = () => {
        this.props.deleteRole(this.props.data._id);
    }

    saveRole = () => {
        this.props.updateRole({
            _id: this.props.data._id,
            name: this.state.name,
            permissions: this.state.selectedPermissions,
        });
        this.setState({
            editRole: false,
            name: '',
            selectedPermissions: [],
        });
    }

    setName(e) {
        if (!e.error) {
            this.setState({
                name: e.target.value,
            });
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

                    </AccordionSummary>
                    <AccordionSummary>
                        <Grid container>
                            <Grid item xs={3}>
                                <InputLabel>Permissions:</InputLabel>
                                <List dense={true}>
                                    {this.props.data.permissions.map((item, index) => <ListItem key={`showRolelistPemissions-${index}`}>
                                        <ListItemText
                                            className={classes.select}
                                            primary={item}
                                        />
                                    </ListItem>)}
                                </List>
                            </Grid>
                            <Grid item xs={3}><InputLabel>Created:</InputLabel><Typography>{this.props.data.createdAt}</Typography></Grid>
                            <Grid item xs={3}><InputLabel>Updated:</InputLabel><Typography >{this.props.data.updatedAt}</Typography></Grid>

                        </Grid>
                    </AccordionSummary>
                </Accordion>
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
                                value={this.state.name}/>

                        </Grid>
                        <Grid item xs={8}>
                            <InputLabel shrink={true}>Permissions</InputLabel>
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
                                {this.props.roles && this.props.roles.permissions.map((item, index) => <MenuItem key={`editRolePermSelect-${index}`} value={item}>{item}</MenuItem>)}
                            </Select>
                            <Button
                                type='button'
                                onClick={ () => {
                                    if (this.state.permission) {
                                        const tempArr = [...this.state.selectedPermissions];
                                        tempArr.push(this.state.permission);
                                        this.setState({
                                            selectedPermissions: tempArr,
                                            permission: '',
                                        });
                                    }
                                }}>
                                <Add/>
                            </Button>

                            <Grid item xs={12}>
                                {
                                    this.state.selectedPermissions.length
                                        ? <List dense={true}>
                                            {this.state.selectedPermissions.map((item, index) => <ListItem key={`editRolelistPemissions-${index}`}>
                                                <ListItemText
                                                    className={classes.select}
                                                    primary={item}
                                                />
                                                <Button
                                                    type='button'
                                                    onClick={ () => {
                                                        const tempArr = [...this.state.selectedPermissions];
                                                        this.setState({
                                                            selectedPermissions: tempArr.filter((tempArrItem) => tempArrItem !== item),
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
                            <Button variant="outlined" aria-label="Add" onClick={this.saveRole}>
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

const mapStateToProps = (state) => ({
    roles: state.roles,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
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
