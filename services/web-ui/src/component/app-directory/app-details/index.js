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
    FormControl, FormControlLabel, Switch, TextField, Snackbar, IconButton, Select, InputLabel, MenuItem, Checkbox, FormLabel, Radio, RadioGroup,
} from '@material-ui/core';
import {
    getAppById,
    updateApp,
} from '../../../action/app-directory';
import { getComponents } from '../../../action/components';
import { getClients } from '../../../action/auth-clients';
import { getDomains } from '../../../action/metadata';

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

const ComponentMiniTeaser = props => <div key={props._id}>
    <div>Name: {props.name}</div>
    <button type={'button'} onClick={props.removeComponent}>Remove</button>
</div>;

class AppDetails extends React.Component {
    state = {
        hasChanges: false,
        app: {
            credentials: {
                credentialsType: null,
                fields: {},
                authClient: null,
            },
            dataModels: [],
            syncMappings: [],
            isGlobal: false,
            components: {
                adapter: null,
                transformer: null,
            },
        },
        componentData: {},
    }

    async componentDidMount() {
        try {
            await this.props.getComponents();
            await this.props.getClients();
            await this.props.getDomains();
            const app = await getAppById(this.props.match.params.id);
            this.setState({
                app: {
                    ...this.state.app,
                    ...app,
                },
            });
            this.setComponentsData(app.components || {});
        } catch (e) {
            console.error(e);
        }
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
            hasChanges: true,
        });
    }

    setComponentsData = (components = this.state.app.components) => {
        const componentData = { ...this.state.componentData };
        Object.keys(components).forEach((key) => {
            const component = this.props.components.all.find(comp => comp.id === components[key]);
            componentData[component.id] = {
                ...component,
                actions: component.descriptor.actions,
                triggers: component.descriptor.triggers,
            };
        });

        this.setState({
            componentData,
        });
    }

    updateComponent = (type, e) => {
        e.preventDefault();

        const components = { ...this.state.app.components };
        const component = this.props.components.all.find(comp => comp.id === e.target.value);

        components[type] = e.target.value;

        this.setState({
            app: {
                ...this.state.app,
                components,
            },
            componentData: {
                ...this.state.componentData,
                [component.id]: {
                    ...component,
                    actions: component.descriptor.actions,
                    triggers: component.descriptor.triggers,
                },
            },
            hasChanges: true,
        });
    }

    // addComponent = (e) => {
    //     e.preventDefault();
    //
    //     const components = [...this.state.app.components];
    //     const component = this.props.components.all.find(comp => comp.id === e.target.value);
    //     components.push({
    //         type: 'component',
    //         name: component.name,
    //         componentId: component.id,
    //     });
    //
    //
    //     this.setState({
    //         app: {
    //             ...this.state.app,
    //             components,
    //         },
    //         componentData: {
    //             [component.id]: {
    //                 actions: component.descriptor.actions,
    //                 triggers: component.descriptor.triggers,
    //             },
    //         },
    //     });
    // }

    toggleDataModel = (dataModel, e) => {
        e.preventDefault();

        let dataModels = [...this.state.app.dataModels];

        if (!e.target.checked) {
            dataModels = dataModels.filter(modelId => modelId !== dataModel.id);
        } else if (!dataModels.includes(dataModel.id)) {
            dataModels.push(dataModel.id);
        }

        this.setState({
            app: {
                ...this.state.app,
                dataModels,
            },
            hasChanges: true,
        });
    };

    handleAppUpdate = async (e) => {
        e.preventDefault();

        if (!this.state.hasChanges) {
            return;
        }

        try {
            await updateApp(this.state.app);
            this.setState({
                hasChanges: 0,
            });
        } catch (err) {
            console.error(err);
        }
    }

    // removeComponent = (index, e) => {
    //     e.preventDefault();
    //
    //     const components = [...this.state.app.components];
    //
    //     const componentData = { ...this.state.componentData };
    //     delete componentData[components[index].id];
    //
    //     components.splice(index, 1);
    //
    //     this.setState({
    //         app: {
    //             ...this.state.app,
    //             components,
    //         },
    //         componentData,
    //         hasChanges: true,
    //     });
    // }

    changeAuthClient = (e) => {
        e.preventDefault();

        this.setState({
            app: {
                ...this.state.app,
                credentials: {
                    ...this.state.app.credentials,
                    authClient: e.target.value,
                },
            },
            hasChanges: true,
        });
    }

    changeCredentials = (e) => {
        e.preventDefault();

        this.setState({
            app: {
                ...this.state.app,
                credentials: {
                    ...this.state.app.credentials,
                    credentialsType: e.target.value,
                },
            },
            hasChanges: true,
        });
    }

    setCredentialsField = (fieldName, e) => {
        e.preventDefault();

        this.setState({
            app: {
                ...this.state.app,
                credentials: {
                    ...this.state.app.credentials,
                    fields: {
                        ...this.state.app.credentials.fields,
                        [fieldName]: e.target.value,
                    },
                },
            },
            hasChanges: true,
        });
    }


    getCredentialsBlock() {
        const {
            classes,
        } = this.props;

        if (this.state.app.credentials.credentialsType === 'authClient') {
            return <FormControl fullWidth className={classes.margin}>
                <TextField
                    label="Scopes"
                    className={classes.textField}
                    value={this.state.app.credentials.fields.scopes}
                    onChange={this.setCredentialsField.bind(this, 'scopes')}
                    margin="normal"
                    required
                />
            </FormControl>;
        }

        return null;
    }

    addNewMapping = (e) => {
        e.preventDefault();

        const syncMappings = [...this.state.app.syncMappings];

        syncMappings.push({
            adapterOperation: '',
            transformerOperation: '',
            sdfAdapterOperation: '',
            direction: 'inbound',
        });

        this.setState({
            app: {
                ...this.state.app,
                syncMappings,
            },
            hasChanges: 1,
        });
    }

    render() {
        const {
            classes,
        } = this.props;

        const filteredComponents = this.props.components.all.filter(component => component.id !== this.state.app.components.adapter && component.id !== this.state.app.components.transformer);

        return (
            <Grid item xs={12}>

                <form onSubmit={this.handleAppUpdate.bind(this)}>

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

                    <FormControl component="fieldset" className={classes.formControl}>
                        <FormLabel component="legend">Credentials type</FormLabel>
                        <RadioGroup name="credentialsType" value={this.state.app.credentials.credentialsType} onChange={this.changeCredentials.bind(this)}>
                            <FormControlLabel value="authClient" control={<Radio />} label="authClient" />
                            <FormControlLabel value="basic" control={<Radio />} label="Simple / Basic (username, password)" />
                            <FormControlLabel value="mixed" control={<Radio />} label="Mixed (API Key, any other structure)" />
                        </RadioGroup>
                    </FormControl>

                    {this.state.app.credentials.credentialsType === 'authClient' && <FormControl fullWidth className={classes.margin}>
                        <InputLabel htmlFor="credentials">Auth client</InputLabel>

                        <Select
                            value={this.state.app.credentials.authClient}
                            onChange={this.changeAuthClient.bind(this)}
                            inputProps={{
                                name: 'authClient',
                                id: 'credentials',
                            }}
                        >
                            {this.props.authClients.available.map(authClient => <MenuItem key={authClient._id} value={authClient._id}>{authClient.name}</MenuItem>)}

                        </Select>
                    </FormControl> }

                    <h3>Data models</h3>

                    {this.props.dataModels.map(dataModel => <FormControlLabel
                        key={dataModel.id}
                        control={
                            <Checkbox
                                checked={this.state.app.dataModels.includes(dataModel.id)}
                                onChange={this.toggleDataModel.bind(this, dataModel)}
                                value={dataModel.id}
                                color="primary"
                            />
                        }
                        label={dataModel.name}
                    />)}


                    <h4>Connectors</h4>

                    <h6>Adapter</h6>
                    {/* {this.state.app.components.find((component, index) => )} */}
                    {/* <ComponentMiniTeaser */}
                    {/*    {...component} */}
                    {/*    key={index} */}
                    {/*    removeComponent={this.removeComponent.bind(this, index)} */}
                    {/* /> */}
                    <FormControl fullWidth className={classes.formControl}>
                        <InputLabel htmlFor="adapter">Adapter</InputLabel>
                        <Select
                            value={this.state.app.components.adapter}
                            onChange={this.updateComponent.bind(this, 'adapter')}
                            inputProps={{
                                name: 'adapter',
                                id: 'adapter',
                            }}
                        >
                            {filteredComponents.map(comp => <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>)}

                        </Select>
                    </FormControl>
                    <div>Selected Adapter: {this.state.app.components.adapter}</div>

                    <h6>Transformer</h6>
                    <FormControl fullWidth className={classes.formControl}>
                        <InputLabel htmlFor="transformer">Transformer</InputLabel>
                        <Select
                            value={this.state.app.components.transformer}
                            onChange={this.updateComponent.bind(this, 'transformer')}
                            inputProps={{
                                name: 'transformer',
                                id: 'transformer',
                            }}
                        >
                            {filteredComponents.map(comp => <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>)}

                        </Select>
                    </FormControl>
                    <div>Selected Transformer: {this.state.app.components.transformer}</div>


                    {this.state.app.components.adapter && this.state.app.components.transformer ? <React.Fragment><h4>Sync Mappings</h4>

                        {this.state.app.syncMappings.map((mapping, index) => <div key={index}>
                            <p>Index: {index},</p>
                            <p>
                            Direction
                                <select>
                                    <option value={'inbound'}>inbound</option>
                                    <option value={'outbound'}>outbound</option>
                                </select>
                            </p>
                            <p>Adapter: {this.state.componentData[this.state.app.components.adapter] && this.state.componentData[this.state.app.components.adapter].name}</p>
                            <select>
                                <optgroup label="Actions">
                                    {Object.keys(this.state.componentData[this.state.app.components.adapter].actions || {}).map(key => <option>{key}</option>)}
                                </optgroup>
                                <optgroup label="Triggers">
                                    {Object.keys(this.state.componentData[this.state.app.components.adapter].triggers || {}).map(key => <option>{key}</option>)}
                                </optgroup>
                            </select>

                            <p>Transformer: {this.state.componentData[this.state.app.components.transformer] && this.state.componentData[this.state.app.components.transformer].name}</p>
                            <select>
                                <optgroup label="Actions">
                                    {Object.keys(this.state.componentData[this.state.app.components.transformer].actions || {}).map(key => <option>{key}</option>)}
                                </optgroup>
                                <optgroup label="Triggers">
                                    {Object.keys(this.state.componentData[this.state.app.components.transformer].triggers || {}).map(key => <option>{key}</option>)}
                                </optgroup>
                            </select>
                        </div>)}
                        <Button onClick={this.addNewMapping.bind(this)}>Add new mapping</Button>
                    </React.Fragment> : 'Please select an adapter and a transformer first' }

                    <div>
                        <Button variant="outlined" aria-label="Add" type={'submit'} disabled={!this.state.hasChanges}>
                        Save
                        </Button>
                    </div>

                </form>

            </Grid>
        );
    }
}

const mapStateToProps = state => ({
    apps: state.components,
    components: state.components,
    auth: state.auth,
    authClients: state.authClients,
    dataModels: state.metadata.domains,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getComponents,
    getClients,
    getDomains,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(AppDetails);
