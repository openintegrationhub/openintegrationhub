import React from 'react';
import { withStyles } from '@material-ui/styles';
import Container from '@material-ui/core/Container';

import { Doughnut } from 'react-chartjs-2';

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

class PieChart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    }

    render() {
        const {
            classes,
        } = this.props;

        return (
            <Container className={classes.container}>
                <div style={{ width: '33%', margin: '0 auto', marginTop: '20px' }}>
                    <Doughnut data={{
                        labels: ['0.7+', '0.2 - 0.7', '0 - 0.2'],
                        datasets: [{
                            data: [17, 33, 50],
                            backgroundColor: ['#07a302', '#ffe700', '#d61e1e'],
                        }],
                    }}
                    options= {{
                        plugins: {},
                    }}
                    />
                </div>
            </Container>
        );
    }
}

export default
withStyles(useStyles)(PieChart);
