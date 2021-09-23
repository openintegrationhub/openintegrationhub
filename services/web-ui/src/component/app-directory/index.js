import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';

import {
    Add,
} from '@material-ui/icons';
import Modal from '@material-ui/core/Modal';
import {
    TextField, FormControl, FormControlLabel, Switch,
} from '@material-ui/core';

// actions
import {
    getApps, createApp, deleteApp, updateApp,
} from '../../action/app-directory';
import AppTeaser from './app-teaser';

const useStyles = {
    wrapper: {
        padding: '20px 0',
        justifyContent: 'center',
    },
    modal: {
        backgroundColor: 'white',
        margin: 'auto',
        outline: 'none',
        padding: '32px',
    },
    button: {
        // backgroundColor: '#ff8200',
        // color: '#ff8200',
        // '&:hover': {
        //     color: '#E67500',
        // },
        marginLeft: '8px',
    },
    modalFooter: {
        display: 'flex',
        flexDirection: 'row-reverse',
        width: '100%',
        marginTop: '24px',
    },
    container: {
        marginTop: '24px',
    },
};

class AppDirectory extends React.Component {
    state = {
        currentState: null,
        addApp: false,
        app: {
            artifactId: '',
            name: '',
            isGlobal: false,
        },
    }

    async componentDidMount() {
        await this.props.getApps();
    }

    addNewApp = async (e) => {
        e.preventDefault();
        await this.props.createApp({ ...this.state.app });
        this.setState({
            addApp: false,
        });
    }

    toggleAddApp = async (e) => {
        e.preventDefault();
        this.setState({
            addApp: true,
            app: {
                ...this.state.app,
                isGlobal: !!(this.props.auth.isAdmin && !this.props.auth.tenant),
            },
        });
    }

    setAppVal = (fieldName, e) => {
        let val = e.target.value;
        if (fieldName === 'isGlobal') {
            val = e.target.checked;
        }
        this.setState({
            app: {
                ...this.state.app,
                [fieldName]: val,
            },
        });
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper} maxWidth={'md'}>
                <Grid container spacing={2}>

                    <Grid item xs={6}>
                        <Button variant="outlined" aria-label="Add" onClick={this.toggleAddApp.bind(this)}>
                            Add <Add/>
                        </Button>
                    </Grid>

                </Grid>
                <div className={classes.container}>
                    {
                        this.props.apps.list.map((item) => <AppTeaser
                            key={`appTeaser-${item._id}`}
                            {...item}
                            onEdit={() => {}}
                            onDelete={() => {}}
                        />)
                    }
                </div>

                <Modal
                    aria-labelledby="simple-modal-title"
                    aria-describedby="simple-modal-description"
                    open={this.state.addApp}
                    onClose={ () => { this.setState({ addApp: false }); }}
                    style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                >
                    <div className={classes.modal}>
                        <Grid container justify="center" spacing={2}>
                            <form onSubmit={this.addNewApp}>
                                <h3>Add App</h3>
                                <FormControl fullWidth className={classes.margin}>
                                    <TextField
                                        id="artifact-id"
                                        label="Artifact Id"
                                        className={classes.textField}
                                        value={this.state.app.artifactId}
                                        onChange={this.setAppVal.bind(this, 'artifactId')}
                                        margin="normal"
                                        required
                                    />
                                </FormControl>

                                <FormControl fullWidth className={classes.margin}>
                                    <TextField
                                        id="app-name"
                                        label="App name"
                                        className={classes.textField}
                                        value={this.state.app.name}
                                        onChange={this.setAppVal.bind(this, 'name')}
                                        margin="normal"
                                        required
                                    />
                                </FormControl>

                                {this.props.auth.isAdmin
                                && <FormControl fullWidth className={classes.margin}>
                                    <FormControlLabel
                                        control={
                                            <Switch checked={this.state.app.isGlobal} onChange={this.setAppVal.bind(this, 'isGlobal')} value="isGlobal" />
                                        }
                                        label="App is global"
                                    />
                                </FormControl>}
                                <div className={classes.modalFooter}>
                                    <Button variant="text" className={classes.button} aria-label="Add" onClick={this.addNewApp}>
                                        Save
                                    </Button>

                                    <Button variant="text" className={classes.button} aria-label="Cancel" onClick={() => { this.setState({ addApp: false }); }}>
                                    Cancel
                                    </Button>
                                </div>
                            </form>
                        </Grid>

                    </div>

                </Modal>
            </Container>
        );
    }
}

const mapStateToProps = (state) => ({
    apps: state.apps,
    auth: state.auth,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getApps,
    createApp,
    updateApp,
    deleteApp,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(AppDirectory);
