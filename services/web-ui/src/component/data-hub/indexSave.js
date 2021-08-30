import React from 'react';
import flow from 'lodash/flow';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import axios from 'axios';
// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
// import InputLabel from '@material-ui/core/InputLabel';
// import MenuItem from '@material-ui/core/MenuItem';
// import FormHelperText from '@material-ui/core/FormHelperText';
// import FormControl from '@material-ui/core/FormControl';
// import Select from '@material-ui/core/Select';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { Bar } from 'react-chartjs-2';
import dataJSON from './data.json';
// import DataTable from './DataTable';
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
            scores:
                {
                    1: 3,
                    2: 8,
                    4: 1,
                    5: 2,
                    6: 5,
                    7: 2,
                    8: 11,
                    15: 1,
                    21: 4,
                },
            duplicateCount: 2,
            subsetCount: 2,
            uniqueCount: 1,

        };
    }

    async componentDidMount() {
        // get tenants
        // try {
        //     const result = await axios({
        //         method: 'get',
        //         url: 'https://localhost:3099/api/v1/tenants',
        //         withCredentials: true,
        //     });
        //     this.setState({ tenants: result.data });
        // } catch (err) {
        //     console.log(err);
        // }
        // // // get schemas
        // try {
        //     const { data } = await axios({
        //         method: 'get',
        //         url: 'http://localhost:3001/api/v1/domains/6113a8d49744d2880a00ed0a/schemas',
        //         withCredentials: true,
        //     });
        //     this.setState({ schemas: data });
        // } catch (err) {
        //     console.log(err);
        // }
        try {
            const { data } = await axios({
                method: 'get',
                url: 'http://data-hub.openintegrationhub.com/data?min_score=1',
                withCredentials: true,
            });
            console.log('Response', data);
            this.setState({ schemas: data });
        } catch (err) {
            console.log(err);
        }
        this.setState({ isLoading: false });

        // add functionality to allow tabs in text area
        // document.getElementById('textbox').addEventListener('keydown', function (e) {
        //     if (e.key === 'Tab') {
        //         e.preventDefault();
        //         const start = this.selectionStart;
        //         const end = this.selectionEnd;
        //         this.value = `${this.value.substring(0, start)
        //         }\t${this.value.substring(end)}`;
        //         this.selectionStart = +start + 1;
        //     }
        // });
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

        const averageScore = dataJSON.data.reduce((a, b) => a + b.enrichmentResults.score, 0);

        const averageNormalizedScore = dataJSON.data.reduce((a, b) => a + b.enrichmentResults.normalizedScore, 0);
        console.log('data', dataJSON);

        const xAxis = Object.keys(this.state.scores);
        const yAxis = Object.values(this.state.scores);
        xAxis.push('Scores');


        const data = {
            labels: xAxis,
            datasets: [
                {
                    label: '#Datasets with this score ',
                    data: yAxis,
                    backgroundColor: [

                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)',
                    ],
                    borderColor: [
                        'grey',
                        // 'rgba(54, 162, 235, 1)',
                        // 'rgba(255, 206, 86, 1)',
                        // 'rgba(75, 192, 192, 1)',
                        // 'rgba(153, 102, 255, 1)',
                        // 'rgba(255, 159, 64, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        };

        const options = {
            scales: {
                yAxes: [
                    {
                        ticks: {
                            beginAtZero: false,
                        },
                    },
                ],

            },
        };


        return (
            <Container className={classes.container}>
                <Bar data={data} options={options} />
                {dataJSON.data.map(item => <div key={item.id}>
                    <Accordion style={{ marginTop: 10 }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                        >
                            <p>{item.content.firstName} {item.content.lastName}</p>
                        </AccordionSummary>
                        <AccordionDetails style={{ display: 'block' }}>
                            <p>ID: {item.id}</p>
                            <p>Enrichments results:</p>
                            <div>Score: {item.enrichmentResults.score}, normalized score: {item.enrichmentResults.normalizedScore}</div><br/>
                            <p>Duplications: {item.enrichmentResults.knownDuplicates.map(duplicate => <li key={duplicate}>{duplicate}</li>)}</p>
                            <p>Tags: {item.enrichmentResults.tags.map(tag => <li key={tag}>{tag}</li>)}</p>
                        </AccordionDetails>
                    </Accordion>
                </div>)}

                <div>
                    <p>Average enrichments:</p>
                    Score: {(averageScore / dataJSON.data.length).toFixed(1)}, normalized score: {(averageNormalizedScore / dataJSON.data.length).toFixed(1)}
                    {/* {result} */}
                </div>
                {/* {!this.state.isLoading && <div style={{ display: 'flex' }}>
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
                {!this.state.isLoading && <div></div>} */}
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
