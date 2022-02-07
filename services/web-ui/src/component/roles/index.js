import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import {
    Select, Switch, TextField, Container, Button, Grid, MenuItem, List, ListItem, ListItemText, InputLabel,
} from '@material-ui/core';
import {
    Add, Remove,
} from '@material-ui/icons';
import Modal from '@material-ui/core/Modal';

// components
import RolesTeaser from './roles-teaser';

// actions
import { getRoles, createRole, getPermissions } from '../../action/roles';

const useStyles = {
    wrapper: {
        padding: '20px 0',
        justifyContent: 'center',
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

class Roles extends React.Component {
    constructor(props) {
        super();
        props.getRoles();
        props.getPermissions();

        this.state = {
            addRole: false,
            global: false,
            name: '',
            permission: '',
            selectedPermissions: [],
        };
    }

    addRole = () => {
        this.setState({
            addRole: true,
        });
    };

    saveRole = () => {
        this.props.createRole({
            name: this.state.name,
            isGlobale: this.state.global,
            permissions: this.state.selectedPermissions,
        });
        this.setState({
            addRole: false,
            global: false,
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

    setGlobal(e) {
        if (!e.error) {
            this.setState({
                global: !this.state.global,
            });
        }
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <Grid container spacing={2}>

                    <Grid item xs={12}>
                        <Button variant="outlined" aria-label="Add" onClick={this.addRole}>
                        Add<Add/>
                        </Button>
                    </Grid>

                </Grid>
                <Grid container justify="center" spacing={2}>
                    {
                        this.props.roles.all.length && this.props.roles.all.map((item, index) => <RolesTeaser key={`roleTeaser-${index}`} data={item}/>)
                    }
                </Grid>

                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.addRole}
                    onClose={ () => { this.setState({ addRole: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >

                    <form className={classes.form}>
                        <Grid item xs={8}>

                            <TextField
                                id="standard-name"
                                label="Name"
                                className={classes.textField}
                                onChange={this.setName.bind(this)}
                                margin="normal"/>

                        </Grid>
                        {
                            this.props.auth.isAdmin
                            && <Grid item xs={8}>
                                <InputLabel shrink={true}>Global</InputLabel>
                                <Switch
                                    checked={this.state.global}
                                    onChange={this.setGlobal.bind(this)}
                                />
                            </Grid>
                        }
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
                                {this.props.roles && this.props.roles.permissions.map((item, index) => <MenuItem key={`addRolePermSelect-${index}`} value={item}>{item}</MenuItem>)}
                            </Select>
                            <Button
                                type='button'
                                onClick={ () => {
                                    const tempArr = [...this.state.selectedPermissions];
                                    tempArr.push(this.state.permission);
                                    this.setState({
                                        selectedPermissions: tempArr,
                                        permission: '',
                                    });
                                }}>
                                <Add/>
                            </Button>

                            <Grid item xs={12}>
                                {
                                    this.state.selectedPermissions.length
                                        ? <List dense={true}>
                                            {this.state.selectedPermissions.map((item, index) => <ListItem key={`addRolelistPemissions-${index}`}>
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
                                this.setState({ addRole: false });
                            }}>
                            close
                            </Button>
                        </Grid>
                    </form>

                </Modal>
            </Container>
        );
    }
}

const mapStateToProps = (state) => ({
    roles: state.roles,
    auth: state.auth,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getRoles,
    createRole,
    getPermissions,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Roles);
