import React from 'react';
import flow from 'lodash/flow';
import PropTypes from 'prop-types';
import SwipeableViews from 'react-swipeable-views';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { Button, Grid } from '@material-ui/core';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import {
    Autorenew,
} from '@material-ui/icons';
import GroupedBar from './GroupedBarChart';
import DataQuality from './DataQuality';
// import dataJSON from './data.json';
import ObjectsOverview from './ObjectsOverview';
// actions
import {
    getDataObjects,
    // plain
    enrichData,
} from '../../action/data-hub';
import RDS from './RDS';

function TabPanel(props) {
    const {
        children, value, index, ...other
    } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`full-width-tabpanel-${index}`}
            aria-labelledby={`full-width-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};

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
    enrich: {
        // width: '100%',
        // background: 'lightgray',
    },
};

class DataHub extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            openTab: 0,
        };
        props.getDataObjects();
    }

    async componentDidMount() {
        // await enrichData();
    }

    handleChange = (event, newValue) => {
        this.setState({ openTab: newValue });
    };

     handleChangeIndex = (index) => {
         this.setState({ openTab: index });
     };

     render() {
         const dataHubObjects = this.props.dataHub.dataObjects;
         console.log('data is', dataHubObjects);
         const dataHubProducts = dataHubObjects.filter((item) => item.content.articleNo);
         const dataHubContacts = dataHubObjects.filter((item) => item.content.firstName);
         const dataHubDocuments = dataHubObjects.filter((item) => item.content.documentId);

         //  var marvelHeroes =  dataHubObjects.filter(function(item) {
         //     return item.id == “Marvel”;
         // });
         console.log('contacts are: ', dataHubContacts);
         console.log('products are: ', dataHubProducts);
         const {
             classes,
         } = this.props;
         //  switch (this.state.sortBy) {
         //  case 'duplicatesDesc':
         //      dataJSON.data.sort((a, b) => b.enrichmentResults.knownDuplicates.length - a.enrichmentResults.knownDuplicates.length);
         //      break;
         //  case 'duplicatesAsc':
         //      dataJSON.data.sort((a, b) => a.enrichmentResults.knownDuplicates.length - b.enrichmentResults.knownDuplicates.length);
         //      break;
         //  case 'scoreDesc':
         //      dataJSON.data.sort((a, b) => b.enrichmentResults.score - a.enrichmentResults.score);
         //      break;
         //  case 'scoreAsc':
         //      dataJSON.data.sort((a, b) => a.enrichmentResults.score - b.enrichmentResults.score);
         //      break;
         //  default:
         //      break;
         //  }

         return (
             <React.Fragment>
                 <AppBar position="static" color="default">
                     <Tabs
                         value={this.state.openTab}
                         onChange={this.handleChange}
                         indicatorColor="primary"
                         textColor="primary"
                         variant="fullWidth"
                         aria-label="full width tabs example"
                     >
                         <Tab label="Data-Quality" />
                         <Tab label="Search & Data Export" />
                         <Tab label="Raw Data Storage" />
                     </Tabs>
                 </AppBar>
                 <Container className={classes.container}>
                     <div className={classes.root}>

                         <SwipeableViews
                             axis='x'
                             index={this.state.openTab}
                             onChangeIndex={this.handleChangeIndex}
                         >
                             <TabPanel value={this.state.openTab} index={0} dir='x'>
                                 <Box style={{ margin: '24px 0 36px' }}>
                                     <Grid container>
                                         <Grid item xs>
                                             <Typography variant="h4" component="h1">Data Quality</Typography>
                                         </Grid>
                                         <Grid item xs="auto">
                                             <Button
                                                 color="primary"
                                                 variant="contained"
                                                 className={classes.enrich}
                                                 onClick={() => enrichData()}
                                                 disableElevation
                                                 startIcon={<Autorenew />}>Enrich Data</Button>
                                         </Grid>
                                     </Grid>
                                 </Box>

                                 <GroupedBar products={dataHubProducts} contacts={dataHubContacts} documents={dataHubDocuments}/>

                                 <Grid container>
                                     <Grid item lg={4} md={4} xs={12}>
                                         <ObjectsOverview type="Contacts" objs={dataHubContacts} colorIndicator="#ff6383"/>
                                     </Grid>
                                     <Grid item lg={4} md={4} xs={12}>
                                         <ObjectsOverview type="Products" objs={dataHubProducts} colorIndicator="#36a2eb"/>
                                     </Grid>
                                     <Grid item lg={4} md={4} xs={12}>
                                         <ObjectsOverview type="Documents" objs={dataHubDocuments} colorIndicator="#4bc0c0"/>
                                     </Grid>
                                 </Grid>
                             </TabPanel>
                             <TabPanel value={this.state.openTab} index={1} dir='x'>
                                 <DataQuality data={dataHubObjects}/>
                             </TabPanel>
                             <TabPanel value={this.state.openTab} index={2} dir='x'>
                                 <RDS/>
                             </TabPanel>
                         </SwipeableViews>
                     </div>
                     <Tab/>

                 </Container>
             </React.Fragment>
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
