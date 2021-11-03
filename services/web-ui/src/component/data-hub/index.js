import React from 'react';
import DateFnsUtils from '@date-io/moment'; // choose your lib
import flow from 'lodash/flow';
import {
    DateTimePicker,
    MuiPickersUtilsProvider,
} from '@material-ui/pickers';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

// Ui
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import { Grid } from '@material-ui/core';

import PieChart from './PieChart';
import dataJSON from './data.json';

// actions
import {
    getDataObjects,
    // plain
    enrichData,
} from '../../action/data-hub';

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
            filterDuplicates: false,
            filterScore: false,
            filterDateFrom: null,
            filterDateTo: null,
            sortBy: '',
        };

        props.getDataObjects();
    }

    async componentDidMount() {
        await enrichData();
    }

    handleFiltering = (event) => {
        this.setState({ ...this.state, [event.target.name]: event.target.checked });
    };

    handleSorting = (event) => {
        this.setState({ sortBy: event.target.value });
    }

    handleDateFrom = (date) => {
        this.setState({ filterDateFrom: date._d });
    };

    handleDateTo = (date) => {
        this.setState({ filterDateTo: date._d });
    };

    render() {
        const {
            classes,
        } = this.props;
        switch (this.state.sortBy) {
        case 'duplicatesDesc':
            dataJSON.data.sort((a, b) => b.enrichmentResults.knownDuplicates.length - a.enrichmentResults.knownDuplicates.length);
            break;
        case 'duplicatesAsc':
            dataJSON.data.sort((a, b) => a.enrichmentResults.knownDuplicates.length - b.enrichmentResults.knownDuplicates.length);
            break;
        case 'scoreDesc':
            dataJSON.data.sort((a, b) => b.enrichmentResults.score - a.enrichmentResults.score);
            break;
        case 'scoreAsc':
            dataJSON.data.sort((a, b) => a.enrichmentResults.score - b.enrichmentResults.score);
            break;
        default:
            break;
        }

        return (
            <Container className={classes.container}>
                <div>
                    <PieChart />
                </div>
                <Grid container>
                    <Grid item md={10} style={{ background: '' }}>
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
                                    <DateTimePicker value={this.state.filterDateFrom} onChange={this.handleDateFrom} clearable/>
                                </MuiPickersUtilsProvider>
                                <span style={{ marginRight: '10px', marginLeft: '10px' }}>To</span>
                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <DateTimePicker value={this.state.filterDateTo} onChange={this.handleDateTo} clearable/>
                                </MuiPickersUtilsProvider></div>
                        </div>
                    </Grid>

                    <Grid item md={2} style={{ background: '', position: 'relative' }}>
                        <div style={{ position: 'absolute', right: 0, bottom: 0 }}>
                            <FormControl className={classes.formControl}>
                                <InputLabel id="demo-simple-select-label">Sort by</InputLabel>
                                <Select
                                    labelId="demo-simple-select-label"
                                    id="demo-simple-select"
                                    value={this.state.sortBy}
                                    onChange={this.handleSorting}
                                >
                                    <MenuItem value='duplicatesDesc'>Duplicates descending</MenuItem>
                                    <MenuItem value='duplicatesAsc'>Duplicates ascending</MenuItem>
                                    <MenuItem value='scoreDesc'>Score descending</MenuItem>
                                    <MenuItem value='scoreAsc'>Score ascending</MenuItem>
                                </Select>
                            </FormControl>
                        </div>
                    </Grid>

                </Grid>
                {dataJSON.data.filter((item) => (!this.state.filterDuplicates && !this.state.filterScore && !(this.state.filterDateFrom) && !(this.state.filterDateTo))
                || (this.state.filterDuplicates && item.enrichmentResults.knownDuplicates.length > 0)
                || (this.state.filterScore && item.enrichmentResults.score)
                || (new Date(this.state.filterDateFrom) < new Date(item.createdAt) && ((new Date(this.state.filterDateTo) > new Date(item.createdAt)))))
                    .map((el) => <div key={el.id}>
                        <Accordion style={{ marginTop: 10 }}>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                aria-controls="panel1a-content"
                                id="panel1a-header"
                            >
                                <p>{el.content.firstName} {el.content.lastName}</p>
                            </AccordionSummary>
                            <AccordionDetails style={{ display: 'block' }}>
                                <p>ID: {el.id}</p>
                                <p>Enrichments results:</p>
                                <div>Score: {el.enrichmentResults.score}, normalized score: {el.enrichmentResults.normalizedScore}</div><br/>
                                <p>Duplications: {el.enrichmentResults.knownDuplicates.map((duplicate) => <li key={duplicate}>{duplicate}</li>)}</p>
                                <p>Tags: {el.enrichmentResults.tags.map((tag) => <li key={tag}>{tag}</li>)}</p>
                                <p>Created: {el.createdAt}</p>
                            </AccordionDetails>
                        </Accordion>
                    </div>)}

            </Container>
        );
    }
}

const mapStateToProps = (state) => ({
    dataHub: state.dataHub,
});
const mapDispatchToProps = (dispatch) => bindActionCreators({
    getDataObjects,
}, dispatch);

export default flow(
    connect(
        mapStateToProps,
        mapDispatchToProps,
    ),
    withStyles(useStyles),
)(DataHub);
