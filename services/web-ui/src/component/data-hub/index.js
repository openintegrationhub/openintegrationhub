import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { axios } from 'axios';
// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

// actions
import {
    getFlows, createFlow, getFlowsPage, switchAddState,
} from '../../action/flows';


const useStyles = {
    formControl: {
        // margin: theme.spacing(1),

        minWidth: 120,
    },
    selectEmpty: {
        // marginTop: theme.spacing(2),
    },
};

class Flows extends React.Component {
    constructor(props) {
        super(props);
        props.getFlows();
        this.state = {
            age: '',
            isLoading: true,
        };
    }

    async componentDidMount() {
        try {
            const result = await axios({
                method: 'get',
                url: 'http://localhost:3099/api/v1/tenants',
                // url: `${conf.endpoints.iam}/api/v1/tenants`,
                withCredentials: true,
            });
            console.log('reszult', result);
            // dispatch({
            //     type: GET_TENANTS,
            //     tenants: result.data,
            // });
        } catch (err) {
            // dispatch({
            //     type: TENANTS_ERROR,
            //     err,
            // });
        }
    }

    handleChange = (event) => {
        this.setState({ age: event.target.value });
    };

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.wrapper}>
                <div>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="demo-simple-select-helper-label">Tenant</InputLabel>
                        <Select
                            labelId="demo-simple-select-helper-label"
                            id="demo-simple-select-helper"
                            value={this.state.age}
                            onChange={this.handleChange}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            <MenuItem value={10}>Ten</MenuItem>
                            <MenuItem value={20}>Twenty</MenuItem>
                            <MenuItem value={30}>Thirty</MenuItem>
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
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            <MenuItem value={10}>Ten</MenuItem>
                            <MenuItem value={20}>Twenty</MenuItem>
                            <MenuItem value={30}>Thirty</MenuItem>
                        </Select>
                        <FormHelperText>Some important helper text</FormHelperText>
                    </FormControl>
                    <input placeholder="Fields"/>
                    <button>Submit</button>
                </div>
            </Container>
        );
    }
}

const mapStateToProps = state => ({
    flows: state.flows,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getFlows,
    createFlow,
    getFlowsPage,
    switchAddState,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(Flows);
