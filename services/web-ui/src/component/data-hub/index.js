import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import axios from 'axios';
// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import DataTable from './DataTable';
// actions
import {
    getTenants,
} from '../../action/tenants';

const useStyles = {

    formControl: {
        minWidth: 120,
    },
    input: {
        height: '48px',
    },
    submitBtn: {
        height: '48px',
    },
};

class DataHub extends React.Component {
    constructor(props) {
        super(props);
        props.getTenants();
        this.state = {
            tenants: '',
            schemas: '',
            isLoading: true,
            selectedTenant: '',
            selectedSchema: '',
            fields: '',
        };
    }

    async componentDidMount() {
        // get tenants
        try {
            const result = await axios({
                method: 'get',
                url: 'https://localhost:3099/api/v1/tenants',
                withCredentials: true,
            });
            this.setState({ tenants: result.data });
        } catch (err) {
            console.log(err);
        }
        // // get schemas
        try {
            const { data } = await axios({
                method: 'get',
                url: 'http://localhost:3001/api/v1/domains/6113a8d49744d2880a00ed0a/schemas',
                withCredentials: true,
            });
            this.setState({ schemas: data });
        } catch (err) {
            console.log(err);
        }
        this.setState({ isLoading: false });

        // add functionality to allow tabs in text area
        document.getElementById('textbox').addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = `${this.value.substring(0, start)
                }\t${this.value.substring(end)}`;
                this.selectionStart = +start + 1;
            }
        });
        return null;
    }

    handleChange = (event) => {
        this.setState({ [event.target.name]: event.target.value });
    };

    handleFields = (event) => {
        this.setState({ fields: event.target.value });
    };

    handleSubmit = () => {
        console.log('Submit button clicked');
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.container}>
                {!this.state.isLoading && <div style={{ display: 'flex' }}>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-simple-select-helper-label">Tenant</InputLabel>
                        <Select
                            labelId="demo-simple-select-helper-label"
                            id="demo-simple-select-helper"
                            name="selectedTenant"
                            value={this.state.selectedTenant}
                            onChange={this.handleChange}
                        >
                            {this.state.tenants.map(tenant => (<MenuItem name="selectedTenant" key={tenant._id} value={tenant._id}>{tenant._id}</MenuItem>))}
                        </Select>
                        <FormHelperText>Some important helper text</FormHelperText>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-simple-select-helper-label">Schema</InputLabel>
                        <Select
                            labelId="demo-simple-select-helper-label"
                            id="demo-simple-select-helper"
                            name="selectedSchema"
                            value={this.state.selectedSchema}
                            onChange={this.handleChange}
                        >
                            {this.state.schemas.data.map(schema => (<MenuItem key={schema.id} value={schema.id}>{schema.id}</MenuItem>))}
                        </Select>
                        <FormHelperText>Some important helper text</FormHelperText>
                    </FormControl>
                    <textarea id="textbox" placeholder="Fields" name="fields" value={this.state.fields} onChange={e => this.handleFields(e)} className={classes.input}></textarea>
                    <div><button className={classes.submitBtn} onClick={this.handleSubmit}>Submit</button></div></div>}
                {!this.state.isLoading && <DataTable/>}
            </Container>
        );
    }
}

const mapStateToProps = state => ({
    tenants: state.tenants,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getTenants,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(DataHub);
