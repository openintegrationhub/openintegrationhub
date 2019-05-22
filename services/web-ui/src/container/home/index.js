import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Button from '@material-ui/core/Button';
import { getUsers } from '../../action/users';
import './index.css';

function Home(props) {
    return (
        <div className="home">
            <Button variant="contained" color="primary" onClick={() => { props.getUsers(); }}>
                Get users
            </Button>

            Users: {JSON.stringify(props.users)}
        </div>
    );
}

const mapStateToProps = state => ({
    users: state.users,
});
const mapDispatchToProps = dispatch => bindActionCreators({
    getUsers,
}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(Home);
