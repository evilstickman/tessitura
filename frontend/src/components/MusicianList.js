import React, { Component } from "react";
import { createRoot } from 'react-dom/client'


class MusicianList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loaded: false,
      placeholder: "Loading"
    };
  }

  componentDidMount() {
    fetch("coordinate/user")
      .then(response => {
        if (response.status > 400) {
          return this.setState(() => {
            return { placeholder: "Something went wrong!" };
          });
        }
        return response.json();
      })
      .then(data => {
        this.setState(() => {
          return {
            data,
            loaded: true
          };
        });
      });
  }

  render() {
    return (
      <div className="container">
        <div className="row">
          <h1>Manage musicians</h1>
        </div>
        <div className="row">
          <ul className="list-group">
            {this.state.data.map(user => {
              return (
                <li key={user.id} className="list-group-item">
                  {user.first_name} {user.last_name} - {user.email}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default MusicianList;
