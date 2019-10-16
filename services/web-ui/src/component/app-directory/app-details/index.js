import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import moment from 'moment';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import { Close as CloseIcon } from '@material-ui/icons';

// Actions
import {
    FormControl, FormControlLabel, Switch, TextField, Snackbar, IconButton,
} from '@material-ui/core';
import {
    getAppById,
} from '../../../action/app-directory';

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

class AppDetails extends React.Component {
    state = {
        hasChanges: false,
        app: {
            credentials: {

            },
            dataModels: [],
            syncMappings: [],
            isGlobal: false,
        },
    }

    async componentDidMount() {
        try {
            const app = await getAppById(this.props.match.params.id);
            this.setState({
                app: {
                    ...app,
                },
            });
        } catch (e) {
            console.error(e);
        }
    }

    setAppVal = (fieldName, e) => {
        console.log('setAppVal', fieldName, e.target.value);
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

    updateComponent = (e) => {

    }

    render() {
        const {
            classes,
        } = this.props;
        return (
            <Grid item xs={12}>

                <form onSubmit={this.updateComponent.bind(this)}>

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

                    <FormControl fullWidth className={classes.margin}>
                        <TextField
                            id="app-desc"
                            label="Description"
                            className={classes.textField}
                            value={this.state.app.description}
                            onChange={this.setAppVal.bind(this, 'description')}
                            margin="normal"
                            required
                        />
                    </FormControl>

                    <FormControl fullWidth className={classes.margin}>
                        <TextField
                            id="app-img"
                            label="Image / Thumbnail"
                            className={classes.textField}
                            value={this.state.app.img}
                            onChange={this.setAppVal.bind(this, 'img')}
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
                        {!this.state.app.isGlobal && !this.props.auth.tenant ? <Snackbar
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'center',
                            }}
                            variant="warning"
                            open={true}
                            autoHideDuration={6000}
                            ContentProps={{
                                'aria-describedby': 'message-id',
                            }}
                            message={<span id="message-id">Global flag removed, but your account is not assigned to any tenant.</span>}
                            action={[
                            ]}
                        /> : null}
                    </FormControl>}

                </form>

                <Button variant="outlined" aria-label="Add" type={'submit'} disabled={!this.state.hasChanges}>
                    Save
                </Button>

            </Grid>
        );
    }
}

const mapStateToProps = state => ({
    apps: state.components,
    auth: state.auth,
});
const mapDispatchToProps = dispatch => bindActionCreators({

}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(AppDetails);
