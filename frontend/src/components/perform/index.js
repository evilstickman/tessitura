import React, { Component } from "react";
import { render } from "react-dom";


class Perform extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loaded: false,
      placeholder: "Loading"
    };
  }

  componentDidMount() {
    fetch("perform/user")
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
    //-- fetch practice grids for user here and list 'em! -->
    return (
      <div className="container">
        <h1>Performer's Practice Tools</h1>
        <div id='practice-grids'>
            <h2>Your Practice Grids</h2>
            <div id="practice-grid-list">
            </div>
        </div>
      </div>
    );
  }
}

export default Perform;

const container = document.getElementById("app");
render(<Perform />, container);