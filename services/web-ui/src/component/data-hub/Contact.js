import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import { Paper } from '@material-ui/core';

const useStyles = {
    container: {
        margin: '40px 0',
    },
    detailsContainer: {
        marginTop: '20px',
        fontSize: '15px',
        fontWeight: 'normal',
        '& .row': {
            display: 'flex',
            alignItems: 'center',
            padding: '16px 0',
            borderTop: '1px solid rgba(0,0,0,.12)',
        },
        '& .key': {
            flexGrow: '1',
            fontWeight: '500',
        },
        '& .tags': {
            fontSize: '13px',
        },
        '& .value': {
            textAlign: 'right',
        },
    },
    categoryHeadline: {
        display: 'flex',
        alignItems: 'center',
        '& .color-indicator': {
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            background: '#ff6384',
            marginRight: '8px',
        },
    },
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
                    padding: 20,
                }}
                >

                    <Typography variant="h6" component="h2" className={classes.categoryHeadline}><div className="color-indicator" />Contacts</Typography>
                    <div className={classes.detailsContainer}>
                        <span className="row">
                            <span className="key">Total:</span>
                            <span className="value">{contacts.length}</span>
                        </span>

                        <span className="row">
                            <span className="key">Average Score</span>
                            <span className="value">60 / 100</span>
                        </span>

                        <span className="row">
                            <span className="key">Tags:</span>
                            <span className="value tags">private, company, finance, tech</span>
                        </span>

                        <span className="row">
                            <span className="key">Duplicates:</span>
                            <span className="value">12</span>
                        </span>
                    </div>
                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(DataHubContact);
