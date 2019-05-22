import React from 'react';
import Button from '@material-ui/core/Button';
import Input from '@material-ui/core/Input';
import update from 'immutability-helper';

import './index.css';

class Login extends React.Component {
  state = {
      userData: {
          username: '',
          password: '',
      },
  }

  submitForm = async (e) => {
      try {
          e.preventDefault();

          // if (
          //     !this.state.userData.password.length
          //   || (this.state.userData.password.length && this.state.passwordIsStrong)
          // ) {
          //     if (!this.state.itsMe && (auth.isTenantAdmin(this.props.user))) {
          //         await this.props.m_updateUserData(
          //             this.props.userId,
          //             this.state.userData,
          //         );
          //     } else {
          //         await this.props.updateUserData(this.state.userData);
          //     }
          //     this.setState({
          //         succeeded: true,
          //     });
          // }
      } catch (err) {
          console.log(err);
      }
  };

  setVal = (fieldName, e) => {
      this.setState({
          userData: update(this.state.userData, {
              [fieldName]: {
                  $set: e.target.value,
              },
          }),
          succeeded: false,
      });
  };

  render() {
      return (
          <div className="App">
              <form>
                  <div className="form-group">
                      <label>username</label>
                      <Input name="username" onChange={this.setVal.bind(this, 'username')} value={this.state.userData.username} required type="email"
                          className="form-control"/>
                  </div>
                  <div className="form-group">
                      <label>password</label>
                      <Input name="password" onChange={this.setVal.bind(this, 'password')} value={this.state.userData.username} required type="email"
                          className="form-control"/>
                  </div>
                  <Button variant="contained" color="primary">Login</Button>
              </form>
          </div>
      );
  }
}

export default Login;
