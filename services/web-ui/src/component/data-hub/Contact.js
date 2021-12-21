import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import { Paper } from '@material-ui/core';

const useStyles = {

};

class DataHubContact extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const {
            classes, contacts,
        } = this.props;

        const tags = [];
        if (contacts.length > 0 && contacts.enrichmentResults) {
            for (let i = 0; i < contacts.length; i++) {
                for (let j = 0; j < contacts[i].enrichmentResults.tags.length; j++) {
                    if (!tags.includes(contacts[i].enrichmentResults.tags[j])) {
                        tags.push(contacts[i].enrichmentResults.tags[j]);
                    }
                }
            // console.log(contacts[i].enrichmentResults.tags);
            // if (!tags.includes(contacts[i].enrichmentResults.tags[i])) {
            //     tags.push(contacts[i].enrichmentResults.tags[i]);
            // }
            }
        }

        console.log('Contacts:', contacts);
        console.log('Tags', tags);
        return (
            <Container className={classes.container}>
                <Paper style={{
                    paddingLeft: 20,
                    paddingRight: 10,
                    paddingTop: 5,
                    paddingBottom: 5,
                }}
                >
                    <h3>Contacts</h3>
                    <p>Total: {contacts.length} </p>
                    <p>Average score: 60 / 100</p>
                    <p>Tags: private, company, finance, tech </p>
                    <p>duplicates: 12 </p>
                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(DataHubContact);
