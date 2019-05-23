import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { withRouter } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import update from 'immutability-helper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { login } from '../../action/user';

import './index.css';

class Auth extends React.Component {
  state = {
      userData: {
          username: '',
          password: '',
      },
      pending: false,
  }

  componentDidUpdate(prevProps) {
      if (this.props.user !== prevProps.user && this.props.user.isLoggedIn) {
          this.props.history.push('/');
      }
      // if (prevProps.tokenInvalid !== this.props.tokenInvalid) {
      //     this.setState({
      //         isLoggedIn: false,
      //     });
      // }
  }

  setVal = (fieldName, e) => {
      this.setState({
          userData: update(this.state.userData, {
              [fieldName]: {
                  $set: e.target.value,
              },
          }),
      });
  };

  login = async (e) => {
      e.preventDefault();
      this.setState({
          pending: true,
      });
      await this.props.login(this.state.userData);
  };

  render() {
      if (this.state.pending) {
          return (
              <CircularProgress color="secondary"/>
          );
      }

      return (
          <div className="App">
              <form onSubmit={this.login.bind(this)} >
                  <div className="form-group">
                      <label htmlFor="username">username</label>
                      <Input id="username" name="username" onChange={this.setVal.bind(this, 'username')} value={this.state.userData.username} />
                  </div>
                  <div className="form-group">
                      <label htmlFor="password">password</label>
                      <Input id="password" type="password" name="password" onChange={this.setVal.bind(this, 'password')} value={this.state.userData.password} />
                  </div>
                  <Button type='submit' variant="contained" color="primary">Login</Button>
              </form>
          </div>
      );
  }
}
const mapStateToProps = state => ({
    user: state.user,
});

const mapDispatchToProps = dispatch => bindActionCreators({
    login,
}, dispatch);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(withRouter(Auth));
