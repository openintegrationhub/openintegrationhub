import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
// Ui
import { withStyles } from '@material-ui/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
// import { Close as CloseIcon } from '@material-ui/icons';

// Actions
import {
    FormControl,
    CircularProgress,
    FormControlLabel,
    Container,
    Switch,
    TextField,
    Snackbar,
    Select,
    InputLabel,
    MenuItem,
    Checkbox,
    FormLabel,
    Radio,
    RadioGroup,
    Table,
    TableHead,
    TableCell,
    TableBody,
    TableRow,
    IconButton,
    ListSubheader,
} from '@material-ui/core';
import { Delete, Save } from '@material-ui/icons';
import {
    getAppById,
    updateApp,
} from '../../../action/app-directory';
import { getComponents } from '../../../action/components';
import { getClients } from '../../../action/auth-clients';
import { getDomains, getDomainSchemas } from '../../../action/metadata';

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
    wrapper: {
        padding: '20px 0',
        justifyContent: 'center',
    },
    formControl: {
        margin: '10px',
        minWidth: 120,
    },
    contentWrapper: {
        maxWidth: '1080px',
        margin: 'auto',
        display: 'block',
    },
    h2: {
        margin: '0 0 16px 0',
    },

    h3: {
        margin: '16px 0 8px 0',
    },
    headlineContainer: {
        marginTop: '60px',
    },

    loader: {
        margin: 'auto',
        marginTop: '100px',
        display: 'block',
    },

};

class AppDetails extends React.Component {
    state = {
        hasChanges: false,
        app: {
            credentials: {
                credentialsType: 'basic',
                fields: {},
                authClient: null,
            },
            // dataModels: [],
            syncMappings: [],
            isGlobal: false,
            components: {
                adapter: null,
                transformer: null,
            },
        },
        componentData: {},
        isLoading: true,
    }

    async componentDidMount() {
        try {
            await this.props.getComponents();
            await this.props.getClients();
            await this.props.getDomains();
            for (const domain of this.props.dataModels) {
                this.props.getDomainSchemas(domain.id);
            }
            const app = await getAppById(this.props.match.params.id);
            this.setComponentsData(app.components || {});

            this.setState({
                app: {
                    ...this.state.app,
                    ...app,
                },
                isLoading: false,
            });
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
            const component = this.props.components.all.find((comp) => comp.id === components[key]);
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
        const component = this.props.components.all.find((comp) => comp.id === e.target.value);

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
            dataModels = dataModels.filter((modelId) => modelId !== dataModel.id);
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
            actionTypes: [],
            dataModels: [],
        });

        this.setState({
            app: {
                ...this.state.app,
                syncMappings,
            },
            hasChanges: 1,
        });
    }

    setSyncMappingField = (fieldName, index, e) => {
        // e.preventDefault();

        if (e.target.value === null) {
            return;
        }

        const syncMappings = [...this.state.app.syncMappings];
        syncMappings[index][fieldName] = e.target.value;

        this.setState({
            app: {
                ...this.state.app,
                syncMappings,
            },
            hasChanges: 1,
        });
    }

    toggleSyncMappingField = (fieldName, index, e) => {
        // e.preventDefault();

        console.log(e.target.value, e.target.checked);

        const syncMappings = [...this.state.app.syncMappings];
        if (!e.target.checked) {
            syncMappings[index][fieldName].splice(syncMappings[index][fieldName].indexOf(e.target.value), 1);
        } else {
            syncMappings[index][fieldName].push(e.target.value);
        }

        this.setState({
            app: {
                ...this.state.app,
                syncMappings,
            },
            hasChanges: 1,
        });
    }

    toggleDataModelsForSyncMapping = (fieldName, index, e) => {
        console.log(e.target.value, e.target.checked);

        const syncMappings = [...this.state.app.syncMappings];
        syncMappings[index][fieldName] = e.target.value;

        this.setState({
            app: {
                ...this.state.app,
                syncMappings,
            },
            hasChanges: 1,
        });
    }

    removeSyncMapping = (index, e) => {
        e.preventDefault();

        const syncMappings = [...this.state.app.syncMappings];

        syncMappings.splice(index, 1);

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

        const domainModelsSelect = [];
        Object.keys(this.props.domainSchemas).forEach((domainsKey) => {
            domainModelsSelect.push(<ListSubheader>{this.props.dataModels.find((domain) => domain.id === domainsKey).name}</ListSubheader>);
            this.props.domainSchemas[domainsKey].forEach((schema) => {
                domainModelsSelect.push(<MenuItem key={schema.id} value={schema.id}>
                    {schema.name}
                </MenuItem>);
            });
        });

        if (this.state.isLoading) {
            return <CircularProgress color={'secondary'} className={classes.loader} />;
        }

        return (
            <Container className={classes.wrapper} fixed>
                <Grid item xs={12} justify="center" className={classes.contentWrapper}>
                    <h1>Edit App</h1>
                    <form onSubmit={this.handleAppUpdate.bind(this)}>
                        <h2 className={classes.h2}>General</h2>
                        <FormControl fullWidth className={classes.margin}>
                            <TextField
                                id="artifact-id"
                                label="Artifact Id"
                                className={classes.textField}
                                value={this.state.app.artifactId}
                                onChange={this.setAppVal.bind(this, 'artifactId')}
                                margin="normal"
                                required
                                disabled={true}
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

                        <FormControl component="fieldset" className={classes.formControl} style={{ marginTop: '16px' }}>
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
                                {this.props.authClients.available.map((authClient) => <MenuItem key={authClient._id} value={authClient._id}>{authClient.name}</MenuItem>)}

                            </Select>

                            {this.getCredentialsBlock()}

                        </FormControl> }

                        {/* <h3>Data models</h3> */}

                        {/* {this.props.dataModels.map(dataModel => <div */}
                        {/*    key={dataModel.id}> */}
                        {/*    <FormControlLabel */}
                        {/*        control={ */}
                        {/*            <Checkbox */}
                        {/*                checked={this.state.app.dataModels.includes(dataModel.id)} */}
                        {/*                onChange={this.toggleDataModel.bind(this, dataModel)} */}
                        {/*                value={dataModel.id} */}
                        {/*                color="primary" */}
                        {/*            /> */}
                        {/*        } */}
                        {/*        label={dataModel.name} */}
                        {/*    /> */}
                        {/*    {this.props.domainSchemas[dataModel.id] && this.props.domainSchemas[dataModel.id].map(schema => <FormControlLabel */}
                        {/*        key={schema.id} */}
                        {/*        control={ */}
                        {/*            <Checkbox */}
                        {/*                onChange={() => {}} */}
                        {/*                value={schema.id} */}
                        {/*                color="primary" */}
                        {/*            /> */}
                        {/*        } */}
                        {/*        label={schema.name} */}
                        {/*    />)} */}
                        {/* </div>)} */}

                        <Grid xs={12} className={classes.headlineContainer} container>
                            <h2 className={classes.h2}>Connectors</h2>
                        </Grid>

                        <h3 className={classes.h3}>Adapter</h3>
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
                                {this.props.components.all.map((comp) => <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>)}

                            </Select>
                        </FormControl>

                        <h4>Transformer</h4>
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
                                {this.props.components.all.map((comp) => <MenuItem key={comp.id} value={comp.id}>{comp.name}</MenuItem>)}

                            </Select>
                        </FormControl>

                        {this.state.app.components.adapter && this.state.app.components.transformer ? <React.Fragment>
                            <Grid xs={12} className={classes.headlineContainer} container style={{ marginBottom: '24px' }}>
                                <Grid xs={9} item style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <h2 className={classes.h2} style={{ marginBottom: '0' }}>Sync Mappings</h2>
                                </Grid>
                                <Grid xs={3} item style={{ display: 'flex', flexDirection: 'row-reverse' }}>
                                    <Button variant={'outlined'} onClick={this.addNewMapping.bind(this)}>+ Add new mapping</Button>
                                </Grid>
                            </Grid>
                            <Grid item xs={12} justify="center" className={classes.contentWrapper}>
                                <Table className={classes.table} aria-label="simple table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Direction</TableCell>
                                            <TableCell>Adapter method</TableCell>
                                            <TableCell>Transformer method</TableCell>
                                            <TableCell>Supported operation</TableCell>
                                            <TableCell>Support data models</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {this.state.app.syncMappings.map((mapping, index) => (
                                            <TableRow key={index}>
                                                <TableCell component="th" scope="row">
                                                    <Select value={mapping.direction}
                                                        onChange={this.setSyncMappingField.bind(this, 'direction', index)}
                                                        required
                                                        displayEmpty>
                                                        <MenuItem value="">
                                                            <em>Select one</em>
                                                        </MenuItem>
                                                        <MenuItem value={'inbound'}>inbound</MenuItem>
                                                        <MenuItem value={'outbound'}>outbound</MenuItem>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>

                                                    <Select onChange={this.setSyncMappingField.bind(this, 'adapterOperation', index)} value={mapping.adapterOperation}
                                                        required
                                                    >
                                                        <MenuItem value="">
                                                            <em>Select one</em>
                                                        </MenuItem>
                                                        <ListSubheader>Actions</ListSubheader>
                                                        {Object.keys(this.state.componentData[this.state.app.components.adapter] ? this.state.componentData[this.state.app.components.adapter].actions || {} : {}).map((key) => <MenuItem key={key} value={key}>{key}</MenuItem>)}
                                                        <ListSubheader>Triggers</ListSubheader>
                                                        {Object.keys(this.state.componentData[this.state.app.components.adapter] ? this.state.componentData[this.state.app.components.adapter].triggers || {} : {}).map((key) => <MenuItem key={key} value={key}>{key}</MenuItem>)}
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        required

                                                        onChange={this.setSyncMappingField.bind(this, 'transformerOperation', index)} value={mapping.transformerOperation} >
                                                        <MenuItem value="">
                                                            <em>Select one</em>
                                                        </MenuItem>
                                                        <ListSubheader>Actions</ListSubheader>
                                                        {Object.keys(this.state.componentData[this.state.app.components.transformer] ? this.state.componentData[this.state.app.components.transformer].actions || {} : {}).map((key) => <MenuItem key={key} value={key}>{key}</MenuItem>)}
                                                        <ListSubheader>Triggers</ListSubheader>
                                                        {Object.keys(this.state.componentData[this.state.app.components.transformer] ? this.state.componentData[this.state.app.components.transformer].triggers || {} : {}).map((key) => <MenuItem key={key} value={key}>{key}</MenuItem>)}
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {['CREATE', 'UPDATE', 'DELETE'].map((op) => <FormControlLabel
                                                        key={op}
                                                        control={
                                                            <Checkbox
                                                                checked={mapping.actionTypes.includes(op)}
                                                                onChange={this.toggleSyncMappingField.bind(this, 'actionTypes', index)}
                                                                value={op}
                                                                inputProps={{
                                                                    'aria-label': 'primary checkbox',
                                                                }}
                                                            />
                                                        }
                                                        label={op}
                                                    />)}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        labelId="demo-mutiple-name-label"
                                                        id="demo-mutiple-name"
                                                        multiple
                                                        value={mapping.dataModels}
                                                        onChange={this.toggleDataModelsForSyncMapping.bind(this, 'dataModels', index)}
                                                        MenuProps={{
                                                            PaperProps: {
                                                                style: {
                                                                    maxHeight: 48 * 4.5 + 8,
                                                                    width: 250,
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        {domainModelsSelect}

                                                    </Select>
                                                </TableCell>
                                                <TableCell><IconButton edge="end" aria-label="comments" onClick={this.removeSyncMapping.bind(this, index)}>
                                                    <Delete />
                                                </IconButton></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Grid>

                        </React.Fragment> : 'Please select an adapter and a transformer first' }

                        <Grid xs={12} container className={classes.headlineContainer} style={{ marginBottom: '60px', flexDirection: 'row-reverse' }}>
                            <Button variant="contained" aria-label="Add" type={'submit'} disabled={!this.state.hasChanges}>
                                <Save style={{ marginRight: '4px' }} /> Save
                            </Button>
                        </Grid>

                    </form>

                </Grid>
            </Container>
        );
    }
}

const mapStateToProps = (state) => ({
    apps: state.components,
    components: state.components,
    auth: state.auth,
    authClients: state.authClients,
    dataModels: state.metadata.domains,
    domainSchemas: state.metadata.domainSchemas,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getComponents,
    getClients,
    getDomains,
    getDomainSchemas,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(AppDetails);
