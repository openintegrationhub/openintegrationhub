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
import DataTable from './Table';
// actions

import {
    getTenants,
} from '../../action/tenants';


const useStyles = {

    formControl: {
        // margin: theme.spacing(1),
        minWidth: 120,
    },
    selectEmpty: {
        // marginTop: theme.spacing(2),
    },
    input: {
        height: '48px',
    },
};

class DataHub extends React.Component {
    constructor(props) {
        super(props);
        props.getTenants();
        this.state = {
            age: '',
            isLoading: true,
            tenants: '',
            schemas: '',
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
        return null;
    }

    handleChange = (event) => {
        this.setState({ fields: event.target.value });
    };

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.container}>
                {!this.state.isLoading && <div>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-simple-select-helper-label">Tenant</InputLabel>
                        <Select
                            labelId="demo-simple-select-helper-label"
                            id="demo-simple-select-helper"
                            value={this.state.age}
                            onChange={this.handleChange}
                        >
                            {this.state.tenants.map(tenant => (<MenuItem key={tenant._id} value={tenant._id}>{tenant._id}</MenuItem>))}
                        </Select>
                        <FormHelperText>Some important helper text</FormHelperText>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-simple-select-helper-label">Schema</InputLabel>
                        <Select
                            labelId="demo-simple-select-helper-label"
                            id="demo-simple-select-helper"
                            value={this.state.age}
                            onChange={this.handleChange}
                        >
                            {this.state.schemas.data.map(schema => (<MenuItem key={schema.id} value={schema.id}>{schema.id}</MenuItem>))}
                        </Select>
                        <FormHelperText>Some important helper text</FormHelperText>
                    </FormControl>
                    <textarea placeholder="Fields" name="fields" value={this.state.fields} onChange={e => this.handleChange(e)} className={classes.input}></textarea>
                    <button>Submit</button>
                    <DataTable/>
                </div>}
            </Container>
        );
    }
}

const mapStateToProps = state => ({
    tenants: state.tenants,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getTenants,
    // createFlow,
    // getFlowsPage,
    // switchAddState,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(DataHub);
