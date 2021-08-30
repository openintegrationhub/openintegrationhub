import React from 'react';
import DateFnsUtils from '@date-io/date-fns'; // choose your lib
import {
    // DatePicker,
    // TimePicker,
    DateTimePicker,
    MuiPickersUtilsProvider,
} from '@material-ui/pickers';

// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
// import { /* Bar, */ Doughnut } from 'react-chartjs-2';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';

import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
// import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import { Grid } from '@material-ui/core';
import PieChart from './PieChart';
import dataJSON from './data.json';

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
        this.state = {
            checkedA: false,
            filterDuplicates: false,
            filterScore: false,
            filterDateFrom: new Date(),
            filterDateTo: new Date(),
            sortBy: '',
            selectedDate: null,
        };
    }

    handleFiltering = (event) => {
        this.setState({ ...this.state, [event.target.name]: event.target.checked });
    };

    handleSorting = (event) => {
        this.setState({ sortBy: event.target.value });
    }

    handleDateFrom = (date) => {
        // setSelectedDate(date);
        this.setState({ filterDateFrom: date });
    };

    handleDateTo = (date) => {
        // setSelectedDate(date);
        this.setState({ filterDateTo: date });
    };


    render() {
        const {
            classes,
        } = this.props;

        console.log('FilteredDuplicates', this.state.filterDuplicates);
        console.log('FilteredScore', this.state.filterScore);
        console.log('Sort by', this.state.sortBy);
        console.log('Date', this.state.selectedDate);
        console.log(dataJSON);
        return (


            <Container className={classes.container}>
                <div>
                    <PieChart />
                </div>
                <Grid container>
                    <Grid item md={9} style={{ background: '' }}>
                        <div style={{ display: 'flex', marginTop: '50px' }}>
                            <FormGroup row>
                                <FormControlLabel
                                    control={<Switch checked={this.state.filterDuplicates} onChange={this.handleFiltering} name="filterDuplicates" />}
                                    label="duplicates"
                                />
                                <FormControlLabel
                                    control={<Switch checked={this.state.filterScore} onChange={this.handleFiltering} name="filterScore" />}
                                    label="score"
                                />
                            </FormGroup>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: '10px' }}>From</span>
                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <DateTimePicker value={this.state.filterDateFrom} onChange={this.handleDateFrom} />
                                </MuiPickersUtilsProvider>
                                <span style={{ marginRight: '10px', marginLeft: '10px' }}>To</span>
                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <DateTimePicker value={this.state.filterDateTo} onChange={this.handleDateTo} />
                                </MuiPickersUtilsProvider></div>


                        </div>
                    </Grid>

                    <Grid item md={3} style={{ background: '', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: 0, bottom: 0 }}>
                            <FormControl className={classes.formControl}>
                                <InputLabel id="demo-simple-select-label">Sort by</InputLabel>
                                <Select
                                    labelId="demo-simple-select-label"
                                    id="demo-simple-select"
                                    value={this.state.sortBy}
                                    onChange={this.handleSorting}
                                >
                                    <MenuItem value='duplicates'>Duplicates</MenuItem>
                                    <MenuItem value='score'>Score</MenuItem>
                                </Select>
                            </FormControl>
                        </div>


                    </Grid>

                </Grid>
                {dataJSON.data.map(item => <div key={item.id}>
                    <Accordion style={{ marginTop: 10 }}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                        >
                            <p>{item.content.firstName} {item.content.lastName}, has a score of: {item.enrichmentResults.score}{item.enrichmentResults.knownDuplicates.length > 0 && `, duplicates: ${item.enrichmentResults.knownDuplicates.length}`}</p>
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
            </Container>

        );
    }
}

export default
withStyles(useStyles)(DataHub);
