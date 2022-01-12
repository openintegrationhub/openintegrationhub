import React from 'react';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import flow from 'lodash/flow';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Input from '@material-ui/core/Input';
import {
    Button,
    Checkbox,
    FormControlLabel,
    FormLabel,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Typography,
} from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import locale from 'react-json-editor-ajrm/locale/en';
import JSONInput from 'react-json-editor-ajrm';
import withForm from '../../../hoc/with-form';
import Loader from '../../loader';
import { getSecrets } from '../../../action/secrets';

const useStyles = {
    wrapper: {
        background: 'rgb(243, 243, 243)',
        width: '100%',
        height: '80vh',
        maxHeight: '1800px',
        margin: 20,
    },
    container: {
        marginTop: '24px',
    },
    componentMiniLogo: {
        width: 30,
        height: 'auto',
    },
    margin: {
        margin: '20px 0',
    },
    paper: {
        background: 'none',
        padding: '30px',
    },
    hidden: {
        display: 'none',
    },
};

class EditAddNode extends React.PureComponent {
    state = {
        data: this.props.data || {
            nodeSettings: {
                applyTransform: '',
            },
        },
        mode: this.props.mode || 'create',
        busy: false,
        loading: true,
    }

    async componentDidMount() {
        this.props.getSecrets();
        this.setState({
            loading: false,
        });
    }

    saveFlow = (e) => {
        e.preventDefault();
        console.log('Form to be saved', this.state);
        this.props.onSave && this.props.onSave(this.state.data);
    }

    setVal = (fieldName, e) => {
        this.setState({
            data: {
                ...this.state.data,
                [fieldName]: e.target.value,
            },
        });
    }

    jsonChange = (fieldName, e) => {
        this.setState({
            data: {
                ...this.state.data,
                [fieldName]: e.jsObject,
            },
        });
    }

    onComponentChange = (e, component) => {
        this.setState({
            data: {
                ...this.state.data,
                componentId: component.id,
            },
        });
    }

    setConnectorFunction = (e, value) => {
        console.log('setConnectorFunction', e, value);
        this.setState({
            data: {
                ...this.state.data,
                function: value.functionName,
            },
        });
    }

    setNodeSetting = (name, e) => {
        console.log('setNodeSetting', e, name);
        const currentState = { ...this.state.data };
        if (e.target.value === 'null' && currentState.nodeSettings) {
            delete currentState.nodeSettings[name];
            console.log('delete applyTransform', currentState.nodeSettings);
        }
        this.setState({
            data: {
                ...currentState,
                nodeSettings: {
                    ...currentState.nodeSettings,
                    [name]: e.target.value,
                },
            },
        });
    }

    toggleNodeSetting = (name, e) => {
        console.log('toggleNodeSetting', e, name);
        this.setState({
            data: {
                ...this.state.data,
                nodeSettings: {
                    ...this.state.data.nodeSettings,
                    [name]: e.target.checked,
                },
            },
        });
    }

    render() {
        const { classes } = this.props;
        const {
            data,
        } = this.state;

        const selectedOption = this.props.components.find(component => component.id === this.state.data.componentId);

        const optionsAndTriggers = [];
        let selectedConnectorFunction = null;

        if (selectedOption && selectedOption.descriptor) {
            // eslint-disable-next-line guard-for-in
            for (const key in selectedOption.descriptor.actions) {
                optionsAndTriggers.push({
                    type: 'action',
                    functionName: key,
                    ...selectedOption.descriptor.actions[key],
                });
            }
            // eslint-disable-next-line guard-for-in
            for (const key in selectedOption.descriptor.triggers) {
                optionsAndTriggers.push({
                    type: 'trigger',
                    functionName: key,
                    ...selectedOption.descriptor.triggers[key],
                });
            }

            selectedConnectorFunction = this.state.data.function ? (selectedOption.descriptor.actions && selectedOption.descriptor.actions[this.state.data.function]) || (selectedOption.descriptor.triggers && selectedOption.descriptor.triggers[this.state.data.function]) : '';
        }

        console.log('EDIT FDATA', this.props.data, this.props.components);
        console.log('optionsAndTriggers', optionsAndTriggers);

        if (this.state.loading) {
            return <Loader />;
        }

        return (

            <Container className={classes.wrapper}>
                <Grid container style={{ overflow: 'scroll', height: '100%' }}>
                    <form onSubmit={this.saveFlow}>

                        <Grid item xs={12} className={classes.margin}>
                            <FormControl fullWidth className={classes.margin}>
                                <InputLabel htmlFor="name">Name</InputLabel>
                                <Input
                                    required
                                    id="name"
                                    name="name"
                                    onChange={this.setVal.bind(this, 'name')}
                                    value={data.name || ''}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <FormControl fullWidth className={classes.margin}>
                                <InputLabel htmlFor="description">Description</InputLabel>
                                <Input
                                    id="description"
                                    name="description"
                                    onChange={this.setVal.bind(this, 'description')}
                                    value={data.description || ''}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <FormControl >
                                <Autocomplete
                                    id="country-select-demo"
                                    style={{ width: 300 }}
                                    options={this.props.components}
                                    classes={{
                                        option: classes.option,
                                    }}
                                    required
                                    onChange={this.onComponentChange}
                                    value={selectedOption}
                                    getOptionSelected={(option, value) => option.id === value.id}
                                    autoHighlight
                                    getOptionLabel={option => option.name}
                                    renderOption={option => (
                                        <React.Fragment>
                                            <span><img src={option.logo} alt={option.name} className={classes.componentMiniLogo} /></span>
                                            {option.name}
                                        </React.Fragment>
                                    )}
                                    renderInput={params => (
                                        <TextField
                                            {...params}
                                            label="Choose a component"
                                            variant="outlined"
                                            inputProps={{
                                                ...params.inputProps,
                                                autoComplete: 'new-password', // disable autocomplete and autofill
                                            }}
                                        />
                                    )}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <FormControl >
                                {selectedOption ? <Autocomplete
                                    id="action-trigger"
                                    required
                                    options={optionsAndTriggers}
                                    groupBy={option => option.type}
                                    getOptionLabel={option => option.title}
                                    value={selectedConnectorFunction}
                                    onChange={this.setConnectorFunction}
                                    style={{ width: 300 }}
                                    renderInput={params => <TextField {...params} label="Connector function" variant="outlined" />}
                                /> : <Typography>Select a component first</Typography>}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <FormControl>
                                <InputLabel id="credentials-label" htmlFor="credentials">Credentials</InputLabel>
                                <Select
                                    labelId="credentials-label"
                                    name="credentials"
                                    value={data.credentialsId || ''}
                                    onChange={this.setVal.bind(this, 'credentialsId')}
                                    style={{ width: '300px' }}
                                >
                                    {this.props.secrets.secrets.map(cred => <MenuItem key={cred._id} value={cred._id}>{cred.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <Typography variant="h5" gutterBottom className={classes.margin}>Node settings <Button onClick={() => this.setState({ isJSONView: !this.state.isJSONView })}> Switch to {this.state.isJSONView ? 'Component view' : 'JSON View'}</Button></Typography>
                            {this.state.isJSONView ? <JSONInput
                                id = 'jsonEdit'
                                locale = {locale}
                                theme = 'dark_vscode_tribute'
                                height = '550px'
                                width = '600px'
                                placeholder = {this.state.data.nodeSettings || {}}
                                onChange={this.jsonChange.bind(this, 'nodeSettings')}
                            /> : null}

                            {!this.state.isJSONView
                                ? <React.Fragment>
                                    <Paper variant="outlined" className={classes.paper}>
                                        <FormControl component="fieldset">
                                            <FormLabel component="legend">Apply transform</FormLabel>
                                            <RadioGroup aria-label="gender" name="gender1"
                                                value={this.state.data.nodeSettings && this.state.data.nodeSettings.applyTransform}
                                                onChange={this.setNodeSetting.bind(this, 'applyTransform')}
                                            >
                                                <FormControlLabel value="null" control={<Radio />} label="none" />
                                                <FormControlLabel value="before" control={<Radio />} label="before" />
                                                <FormControlLabel value="both" control={<Radio />} label="both" />
                                            </RadioGroup>
                                        </FormControl>

                                        <div>
                                            {this.state.data.nodeSettings && this.state.data.nodeSettings.applyTransform && this.state.data.nodeSettings.applyTransform !== 'null' ? <FormControl fullWidth className={classes.margin}>
                                                <InputLabel htmlFor="description">transformFunction</InputLabel>
                                                <Input
                                                    id="transformFunction"
                                                    name="transformFunction"
                                                    onChange={this.setNodeSetting.bind(this, 'transformFunction')}
                                                    value={this.state.data.nodeSettings.transformFunction || ''}
                                                />
                                            </FormControl> : null}
                                            {this.state.data.nodeSettings && this.state.data.nodeSettings.applyTransform === 'both' ? <FormControl fullWidth className={classes.margin}>
                                                <InputLabel htmlFor="description">secondTransformFunction</InputLabel>
                                                <Input
                                                    id="secondTransformFunction"
                                                    name="secondTransformFunction"
                                                    onChange={this.setNodeSetting.bind(this, 'secondTransformFunction')}
                                                    value={this.state.data.nodeSettings.secondTransformFunction || ''}
                                                />
                                            </FormControl> : null}

                                        </div>
                                    </Paper>

                                    <FormControl fullWidth className={classes.margin}>
                                        <InputLabel htmlFor="description">applicationUid</InputLabel>
                                        <Input
                                            id="applicationUid"
                                            name="applicationUid"
                                            onChange={this.setNodeSetting.bind(this, 'applicationUid')}
                                            value={(this.state.data.nodeSettings && this.state.data.nodeSettings.applicationUid) || ''}
                                        />
                                    </FormControl>

                                    <FormControl fullWidth className={classes.margin}>
                                        <InputLabel htmlFor="description">alternateAppUid</InputLabel>
                                        <Input
                                            id="alternateAppUid"
                                            name="alternateAppUid"
                                            onChange={this.setNodeSetting.bind(this, 'alternateAppUid')}
                                            value={(this.state.data.nodeSettings && this.state.data.nodeSettings.alternateAppUid) || ''}
                                        />
                                    </FormControl>

                                    <FormControl fullWidth className={classes.margin}>
                                        <InputLabel htmlFor="description">appId</InputLabel>
                                        <Input
                                            id="appId"
                                            name="appId"
                                            onChange={this.setNodeSetting.bind(this, 'appId')}
                                            value={(this.state.data.nodeSettings && this.state.data.nodeSettings.appId) || ''}
                                        />
                                    </FormControl>

                                    <div>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.data.nodeSettings && this.state.data.nodeSettings.idLinking}
                                                    onChange={this.toggleNodeSetting.bind(this, 'idLinking')}
                                                    name="idLinking"
                                                    color="primary"
                                                />
                                            }
                                            label="idLinking"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.data.nodeSettings && this.state.data.nodeSettings.autoSaveSnapshots}
                                                    onChange={this.toggleNodeSetting.bind(this, 'autoSaveSnapshots')}
                                                    name="autoSaveSnapshots"
                                                    color="primary"
                                                />
                                            }
                                            label="autoSaveSnapshots"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.data.nodeSettings && this.state.data.nodeSettings.governance}
                                                    onChange={this.toggleNodeSetting.bind(this, 'governance')}
                                                    name="governance"
                                                    color="primary"
                                                />
                                            }
                                            label="governance"
                                        />
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={this.state.data.nodeSettings && this.state.data.nodeSettings.storeRawRecord}
                                                    onChange={this.toggleNodeSetting.bind(this, 'storeRawRecord')}
                                                    name="storeRawRecord"
                                                    color="primary"
                                                />
                                            }
                                            label="storeRawRecord"
                                        />
                                    </div>
                                </React.Fragment>
                                : null }

                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <FormControl className={classes.margin}>
                                <Typography variant="h5" gutterBottom>Fields</Typography>
                                <JSONInput
                                    id = 'jsonEdit'
                                    locale = {locale}
                                    theme = 'dark_vscode_tribute'
                                    height = '550px'
                                    width = '600px'
                                    placeholder = {this.state.data.fields || {}}
                                    onChange={this.jsonChange.bind(this, 'fields')}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} className={classes.margin}>
                            <Button type="submit" variant="contained" color="primary">Save</Button>
                        </Grid>
                    </form>
                </Grid>

            </Container>


        );
    }
}

const mapStateToProps = state => ({
    components: state.components.all,
    secrets: state.secrets,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getSecrets,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
    withForm,
)(EditAddNode);
