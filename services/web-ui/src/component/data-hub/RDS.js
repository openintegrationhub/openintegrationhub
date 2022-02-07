import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
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

                <Box style={{ margin: '24px 0 36px' }}>
                    <Grid container>
                        <Grid item xs>
                            <Typography variant="h4" component="h1">Raw Data Storage</Typography>
                        </Grid>
                        <Grid item xs="auto">

                            <IconButton 
                                //   onClick={this.removeSyncMapping.bind(this, index)}
                                >
                                <ArrowLeftIcon/>
                            </IconButton>

                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <DateTimePicker value={this.state.filterDateFrom} onChange={this.handleDateFrom} clearable/>
                            </MuiPickersUtilsProvider>

                            <span style={{ marginRight: '10px', marginLeft: '10px' }}>To</span>

                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <DateTimePicker value={this.state.filterDateTo} onChange={this.handleDateTo} clearable/>
                            </MuiPickersUtilsProvider>

                            <IconButton 
                            //   onClick={this.removeSyncMapping.bind(this, index)}
                            >
                                <ArrowRightIcon/>
                        </IconButton>

                        </Grid>
                    </Grid>
                </Box>

              <MultiAxisLineChart/>

                {/* <Box style={{ margin: '32px 0 36px', paddingTop: '32px', borderTop: '1px solid rgba(0,0,0, .12)' }}>    
                    <Typography variant="h5" component="h2">Select Time Range</Typography>
                </Box>
                <Grid container justifyContent="center" style={{ margin: '40px 0'}}>
                  <Grid item xs style={{ background: 'lightyellow', display: 'flex' }}>

                    

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
              </Grid> */}
            </Container>
        );
    }
}

export default
withStyles(useStyles)(RDS);
