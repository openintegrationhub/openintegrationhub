import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import './index.css';

function Foo() {
    return (
        <div className="home">
            Fooo
        </div>
    );
}

const mapStateToProps = () => ({
});
const mapDispatchToProps = dispatch => bindActionCreators({
}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(Foo);
