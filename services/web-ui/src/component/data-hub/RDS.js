import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import { Grid } from '@material-ui/core';
import DateFnsUtils from '@date-io/moment';
import {
    DateTimePicker,
    MuiPickersUtilsProvider,
} from '@material-ui/pickers';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import MultiAxisLineChart from './MultiAxisLineChart';

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

class RDS extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            filterDuplicates: false,
            filterScore: false,
            filterDateFrom: null,
            filterDateTo: null,
            sortBy: '',
        };
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

      return (
          <Container className={classes.container}>
              <MultiAxisLineChart/>
              <Grid container>
                  <Grid item md={10} style={{ background: '', display: 'flex' }}>
                      <button><ArrowLeftIcon/></button>
                      <MuiPickersUtilsProvider utils={DateFnsUtils}>
                          <DateTimePicker value={this.state.filterDateFrom} onChange={this.handleDateFrom} clearable/>
                      </MuiPickersUtilsProvider>
                      <span style={{ marginRight: '10px', marginLeft: '10px' }}>To</span>
                      <MuiPickersUtilsProvider utils={DateFnsUtils}>
                          <DateTimePicker value={this.state.filterDateTo} onChange={this.handleDateTo} clearable/>
                      </MuiPickersUtilsProvider>
                      <button><ArrowRightIcon/></button>
                  </Grid>
              </Grid>
          </Container>
      );
  }
}

export default
withStyles(useStyles)(RDS);
