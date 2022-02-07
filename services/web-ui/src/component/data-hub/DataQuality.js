import React from 'react';
import DateFnsUtils from '@date-io/moment';
import {
    DateTimePicker,
    MuiPickersUtilsProvider,
} from '@material-ui/pickers';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import {
    CloudDownload, Search
} from '@material-ui/icons';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import InputAdornment from '@material-ui/core/InputAdornment';
import { Grid } from '@material-ui/core';
import TextField from '@material-ui/core/TextField';
import Chip from './Chip';
// import dataJSON from './data.json';

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
    chipContainer: {
        display: 'flex',
        margin: '8px 0',
    },
    filterContainer: {
        margin: '8px 0 24px',
        '& .category-headline': {
            fontWeight: '500',
            color: 'rgba(0,0,0,.4)',
        }
    },
};

class DataQuality extends React.Component {
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
          data,
      } = this.props;

      switch (this.state.sortBy) {
      case 'duplicatesDesc':
          data.sort((a, b) => b.enrichmentResults.knownDuplicates.length - a.enrichmentResults.knownDuplicates.length);
          break;
      case 'duplicatesAsc':
          data.sort((a, b) => a.enrichmentResults.knownDuplicates.length - b.enrichmentResults.knownDuplicates.length);
          break;
      case 'scoreDesc':
          data.sort((a, b) => b.enrichmentResults.score - a.enrichmentResults.score);
          break;
      case 'scoreAsc':
          data.sort((a, b) => a.enrichmentResults.score - b.enrichmentResults.score);
          break;
      default:
          break;
      }

      console.log('Sorting', this.state.sortBy);

      //   const condition = data.filter((item) => (!this.state.filterDuplicates && !this.state.filterScore && !(this.state.filterDateFrom) && !(this.state.filterDateTo))
      //   || (this.state.filterDuplicates && item.enrichmentResults.knownDuplicates.length > 0)
      //   || (this.state.filterScore && item.enrichmentResults.score)
      //   || (new Date(this.state.filterDateFrom) < new Date(item.createdAt) && ((new Date(this.state.filterDateTo) > new Date(item.createdAt)))));
      const condition = data.filter((item) => (!this.state.filterDuplicates && !this.state.filterScore && !(this.state.filterDateFrom) && !(this.state.filterDateTo))
      || (this.state.filterDuplicates && item.enrichmentResults.knownDuplicates.length > 0)
      || (item.enrichmentResults.score)
      || (new Date(this.state.filterDateFrom) < new Date(item.createdAt) && ((new Date(this.state.filterDateTo) > new Date(item.createdAt)))));
      console.log('Condition', condition);

      return (
          <Container className={classes.container}>

            <Box style={{ margin: '24px 0 36px' }}>    
                <Typography variant="h4" component="h1" className="category-headline">Search & Data Export</Typography>
            </Box>

              <TextField
                id="outlined-basic"
                label="Search"
                variant="outlined"
                style={{ width: '100%' }}
                placeholder="Search"
                autoFocus
                InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />

            <Grid container spacing={4} className={classes.filterContainer}>
                <Grid item xs={4}>
                    <Typography variant="body1" className="category-headline">Filter by Type</Typography>
                    <div className={classes.chipContainer}>
                        <Chip label="DataHub element" />
                        <Chip label="RDS entry" />
                    </div>
                </Grid>
                <Grid item xs={2}>
                    <Typography variant="body1" className="category-headline">Filter by Score</Typography>
                    <FormGroup row>
                        {/* <FormControlLabel
                            control={<Switch checked={this.state.filterDuplicates} onChange={this.handleFiltering} name="filterDuplicates" />}
                            label="duplicates"
                        /> */}
                        <FormControlLabel
                            control={<Switch checked={this.state.filterScore} onChange={this.handleFiltering} name="filterScore" />}
                            label="score"
                        />
                    </FormGroup>
                </Grid>
                <Grid item xs={6}>
                    <Typography variant="body1" className="category-headline">Filter by Time Range</Typography>
                    <div>
                        <span style={{ marginRight: '10px' }}>From</span>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <DateTimePicker value={this.state.filterDateFrom} onChange={this.handleDateFrom} clearable/>
                        </MuiPickersUtilsProvider>
                        <span style={{ marginRight: '10px', marginLeft: '10px' }}>To</span>
                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                            <DateTimePicker value={this.state.filterDateTo} onChange={this.handleDateTo} clearable/>
                        </MuiPickersUtilsProvider>
                    </div>
                </Grid>
            </Grid>
            

              <Box style={{ margin: '32px 0 36px', paddingTop: '32px', borderTop: '1px solid rgba(0,0,0, .12)' }}>
                <Grid container alignItems="center" spacing={4  }>
                    <Grid item xs>
                        <Typography variant="h5" component="h2">Results</Typography>
                    </Grid>
                    <Grid item xs="auto">
                        <Button 
                            color="primary"
                            variant="contained"
                            // className={classes.enrich}
                            // onClick={() => enrichData()}
                            disableElevation
                            startIcon={<CloudDownload />}>Export Results</Button>
                    </Grid>
                    <Grid item xs="auto">
                    <FormControl className={classes.formControl}>
                              <InputLabel id="demo-simple-select-label">Sort by</InputLabel>
                              <Select
                                  labelId="demo-simple-select-label"
                                  id="demo-simple-select"
                                  value={this.state.sortBy}
                                  onChange={this.handleSorting}
                              >
                                  {/* <MenuItem value='duplicatesDesc'>Duplicates descending</MenuItem>
                                  <MenuItem value='duplicatesAsc'>Duplicates ascending</MenuItem> */}
                                  <MenuItem value='scoreDesc'>Score descending</MenuItem>
                                  <MenuItem value='scoreAsc'>Score ascending</MenuItem>
                              </Select>
                          </FormControl>
                    </Grid>
                </Grid>
            </Box>

            {!condition.length ? <Box style={{ color: 'rgba(0,0,0, .4)', textAlign: 'center', padding: '24px', margin: '24px', borderRadius: '16px', border: '1px solid rgba(0,0,0, .12)' }}>
                    <Typography variant="h6" component="span">No entries found.</Typography>
                    <Typography variant="body1">Please enrich the data again or redefine your search.</Typography>
                </Box> : <React.Fragment>
            


            <Box style={{ margin: '32px 0 36px', paddingTop: '32px', borderTop: '1px dashed rgba(0,0,0, .12)' }}>
                <Typography variant="h6" component="h3">Contacts</Typography>                    
            </Box>

              {condition
                  .map((el) => <div key={el.id}>
                      {el.content.firstName && <Accordion style={{ marginTop: 10 }}>
                          <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              aria-controls="panel1a-content"
                              id="panel1a-header"
                          >
                              <div><p>{el.content.firstName} {el.content.lastName},  Score: {el.enrichmentResults && el.enrichmentResults.score}</p> </div>
                          </AccordionSummary>
                          <AccordionDetails style={{ display: 'block' }}>
                              <p>ID: {el.id}</p>
                              <p>Score: {el.enrichmentResults ? el.enrichmentResults.score : ''}</p>
                              {el.enrichmentResults && <p>Tags: {el.enrichmentResults.tags.map((tag, index) => <div key={index}>{tag}</div>)}</p>}
                          </AccordionDetails>
                      </Accordion>}
                  </div>)}

            <Box style={{ margin: '32px 0 36px', paddingTop: '32px', borderTop: '1px dashed rgba(0,0,0, .12)' }}>
                <Typography variant="h6" component="h3">Products</Typography>                    
            </Box>

              {condition
                  .map((el, index) => <div key={el.id}>
                      {el.content.articleNo && <Accordion style={{ marginTop: 10 }}>
                          <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              aria-controls="panel1a-content"
                              id="panel1a-header"
                          >

                              <div>
                                  <p>{el.content.articleNo}</p>
                                  <p>{el.content.baseType},  Score: {el.enrichmentResults.score} </p>
                              </div>

                              {/* <p style={{ marginLeft: '20px' }}>Date: {new Date(el.createdAt).toLocaleDateString('de-DE')}</p> */}
                          </AccordionSummary>
                          <AccordionDetails style={{ display: 'block' }}>
                              <p>ID: {el.id}</p>
                              <p>Score: {el.enrichmentResults ? el.enrichmentResults.score : ''}</p>
                              {el.enrichmentResults && <p>Tags: {el.enrichmentResults.tags.map((tag, index) => <div key={index}>{tag}</div>)}</p>}
                              {/* <div>Score: {el.enrichmentResults.score}, normalized score: {el.enrichmentResults.normalizedScore}</div><br/> */}
                              {/* <p>Duplications: {el.enrichmentResults.knownDuplicates.map((duplicate) => <li key={duplicate}>{duplicate}</li>)}</p> */}
                              {/* <p>Tags: {el.enrichmentResults.tags.map((tag) => <li key={tag}>{tag}</li>)}</p> */}
                              {/* <p>Created: {el.createdAt}</p> */}
                          </AccordionDetails>
                      </Accordion>}
                  </div>)}

            <Box style={{ margin: '32px 0 36px', paddingTop: '32px', borderTop: '1px dashed rgba(0,0,0, .12)' }}>
                <Typography variant="h6" component="h3">Documents</Typography>                    
            </Box>

              {condition
                  .map((el) => <div key={el.id}>
                      {el.content.filesize && <Accordion style={{ marginTop: 10 }}>
                          <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              aria-controls="panel1a-content"
                              id="panel1a-header"
                          >

                              <div> <p>{el.content.name},  Score: {el.enrichmentResults.score} </p> </div>

                              {/* <p style={{ marginLeft: '20px' }}>Date: {new Date(el.createdAt).toLocaleDateString('de-DE')}</p> */}
                          </AccordionSummary>
                          <AccordionDetails style={{ display: 'block' }}>
                              <p>ID: {el.id}</p>
                              <p>Score: {el.enrichmentResults ? el.enrichmentResults.score : ''}</p>
                              {el.enrichmentResults && <p>Tags: {el.enrichmentResults.tags.map((tag, index) => <div key={index}>{tag}</div>)}</p>}
                              {/* <div>Score: {el.enrichmentResults.score}, normalized score: {el.enrichmentResults.normalizedScore}</div><br/> */}
                              {/* <p>Duplications: {el.enrichmentResults.knownDuplicates.map((duplicate) => <li key={duplicate}>{duplicate}</li>)}</p> */}
                              {/* <p>Tags: {el.enrichmentResults.tags.map((tag) => <li key={tag}>{tag}</li>)}</p> */}
                              {/* <p>Created: {el.createdAt}</p> */}
                          </AccordionDetails>
                      </Accordion>}
                  </div>)}
                </React.Fragment>}

          </Container>
      //   <Container className={classes.container}>
      //       <TextField id="outlined-basic" label="Search" variant="outlined" style={{ width: '100%' }}/>
      //       <Grid container>
      //           <Grid item md={10} style={{ background: '' }}>
      //               <Chip label="DataHub element"/>
      //               <Chip label="RDS entry"/>
      //               <div style={{ display: 'flex', marginTop: '50px' }}>
      //                   <FormGroup row>
      //                       <FormControlLabel
      //                           control={<Switch checked={this.state.filterDuplicates} onChange={this.handleFiltering} name="filterDuplicates" />}
      //                           label="duplicates"
      //                       />
      //                       <FormControlLabel
      //                           control={<Switch checked={this.state.filterScore} onChange={this.handleFiltering} name="filterScore" />}
      //                           label="score"
      //                       />
      //                   </FormGroup>
      //                   <div style={{ display: 'flex', alignItems: 'center' }}>
      //                       <span style={{ marginRight: '10px' }}>From</span>
      //                       <MuiPickersUtilsProvider utils={DateFnsUtils}>
      //                           <DateTimePicker value={this.state.filterDateFrom} onChange={this.handleDateFrom} clearable/>
      //                       </MuiPickersUtilsProvider>
      //                       <span style={{ marginRight: '10px', marginLeft: '10px' }}>To</span>
      //                       <MuiPickersUtilsProvider utils={DateFnsUtils}>
      //                           <DateTimePicker value={this.state.filterDateTo} onChange={this.handleDateTo} clearable/>
      //                       </MuiPickersUtilsProvider>
      //                   </div>
      //               </div>
      //           </Grid>
      //           <Grid item md={2} style={{ background: '', position: 'relative' }}>
      //               <div style={{ position: 'absolute', right: 0, bottom: 0 }}>
      //                   <FormControl className={classes.formControl}>
      //                       <InputLabel id="demo-simple-select-label">Sort by</InputLabel>
      //                       <Select
      //                           labelId="demo-simple-select-label"
      //                           id="demo-simple-select"
      //                           value={this.state.sortBy}
      //                           onChange={this.handleSorting}
      //                       >
      //                           <MenuItem value='duplicatesDesc'>Duplicates descending</MenuItem>
      //                           <MenuItem value='duplicatesAsc'>Duplicates ascending</MenuItem>
      //                           <MenuItem value='scoreDesc'>Score descending</MenuItem>
      //                           <MenuItem value='scoreAsc'>Score ascending</MenuItem>
      //                       </Select>
      //                   </FormControl>
      //               </div>
      //           </Grid>
      //       </Grid>
      //       {dataJSON.data.filter((item) => (!this.state.filterDuplicates && !this.state.filterScore && !(this.state.filterDateFrom) && !(this.state.filterDateTo))
      //   || (this.state.filterDuplicates && item.enrichmentResults.knownDuplicates.length > 0)
      //   || (this.state.filterScore && item.enrichmentResults.score)
      //   || (new Date(this.state.filterDateFrom) < new Date(item.createdAt) && ((new Date(this.state.filterDateTo) > new Date(item.createdAt)))))
      //           .map((el) => <div key={el.id}>
      //               <Accordion style={{ marginTop: 10 }}>
      //                   <AccordionSummary
      //                       expandIcon={<ExpandMoreIcon />}
      //                       aria-controls="panel1a-content"
      //                       id="panel1a-header"
      //                   >
      //                       <p>{el.content.firstName} {el.content.lastName}</p> <p style={{ marginLeft: '20px' }}>Score: {/* {el.enrichmentResults.score} */} </p>
      //                       {/* <p style={{ marginLeft: '20px' }}>Date: {new Date(el.createdAt).toLocaleDateString('de-DE')}</p> */}
      //                   </AccordionSummary>
      //                   <AccordionDetails style={{ display: 'block' }}>
      //                       <p>ID: {el.id}</p>
      //                       <p>Enrichments results:</p>
      //                       {/* <div>Score: {el.enrichmentResults.score}, normalized score: {el.enrichmentResults.normalizedScore}</div><br/> */}
      //                       {/* <p>Duplications: {el.enrichmentResults.knownDuplicates.map((duplicate) => <li key={duplicate}>{duplicate}</li>)}</p> */}
      //                       {/* <p>Tags: {el.enrichmentResults.tags.map((tag) => <li key={tag}>{tag}</li>)}</p> */}
      //                       {/* <p>Created: {el.createdAt}</p> */}
      //                   </AccordionDetails>
      //               </Accordion>
      //           </div>)}
      //   </Container>
      );
  }
}

export default
withStyles(useStyles)(DataQuality);
