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
            background: '#36a2eb',
            marginRight: '8px',
        },
    },
};

class DataHubProduct extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const {
            classes,
            products,
        } = this.props;

        return (
            <Container className={classes.container}>
                <Paper style={{
                    padding: 20,
                }}
                >
                    <Typography variant="h6" component="h2" className={classes.categoryHeadline}><div className="color-indicator" />Products</Typography>
                    <div className={classes.detailsContainer}>
                        <span className="row">
                            <span className="key">Total:</span>
                            <span className="value">{products.length}</span>
                        </span>

                        <span className="row">
                            <span className="key">Average Score</span>
                            <span className="value">72 / 100</span>
                        </span>

                        <span className="row">
                            <span className="key">Tags:</span>
                            <span className="value tags">furniture, web, toys, cars</span>
                        </span>

                        <span className="row">
                            <span className="key">Duplicates:</span>
                            <span className="value">2</span>
                        </span>
                    </div>

                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(DataHubProduct);
