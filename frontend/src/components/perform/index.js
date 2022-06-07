import React, { Component } from "react";
import { render } from "react-dom";
import PracticeGridList from "./PracticeGridList";


class Perform extends Component {
  render() {
    //-- fetch practice grids for user here and list 'em! -->
    return (
      <div className="container">
        <h1>Performer's Practice Tools</h1>
        <div id='practice-grids'>
            <h2>Your Practice Grids</h2>
            <div id="practice-grid-list">
              <PracticeGridList />
            </div>
        </div>
      </div>
    );
  }
}

export default Perform;

const container = document.getElementById("app");
render(<Perform />, container);