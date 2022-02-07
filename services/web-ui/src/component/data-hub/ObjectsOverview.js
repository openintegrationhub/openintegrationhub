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

function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

class ObjectsOverview extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        const {
            classes, objs, type, colorIndicator,
        } = this.props;

        const tags = [];
        // let averageScore = 0
        const scores = [];
        const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

        if (objs.length > 0) {
            for (const obj of objs) {
                if (obj.enrichmentResults.tags) {
                    for (const tag of obj.enrichmentResults.tags) {
                        if (!tags.includes(tag)) {
                            tags.push(tag);
                        }
                    }
                }
                if (obj.enrichmentResults.score) {
                    scores.push(obj.enrichmentResults.score);
                }
            }
        }

        return (
            <Container className={classes.container}>
                <Paper style={{
                    padding: 20,
                }}
                >

                    <Typography variant="h6" component="h2" className={classes.categoryHeadline}><div className="color-indicator" style={{ background: colorIndicator }}/>{type}</Typography>
                    <div className={classes.detailsContainer}>
                        <span className="row">
                            <span className="key">Total:</span>
                            <span className="value">{objs.length}</span>
                        </span>

                        <span className="row">
                            <span className="key">Average Score</span>
                            <span className="value">{average(scores)}</span>
                        </span>

                        <span className="row">
                            <span className="key">Tags:</span>
                            <span className="value tags">{tags}</span>
                        </span>

                        <span className="row">
                            <span className="key">Duplicates:</span>
                            <span className="value">{getRandomArbitrary(1, 4)}</span>
                        </span>
                    </div>
                </Paper>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(ObjectsOverview);
