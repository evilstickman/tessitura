import React, { Component } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { createRoot } from 'react-dom/client'
import PracticeGridList from "./PracticeGridList";
import PracticeGrid from "./practice_grid";

function PracticeGridListDetail() {
  return (

    <div id='practice-grids'>
      <h2>Your Practice Grids</h2>
      <div id="practice-grid-list">
        <PracticeGridList />
      </div>
    </div>
  )
}

class Perform extends Component {
  render() {
    //-- fetch practice grids for user here and list 'em! -->
    return (
      <div className="container">
        <h1>Performer's Practice Tools</h1>
        <Routes>
          <Route path="practice_grid_display/:gridId" element = {<PracticeGrid />} />
          <Route path="" element = {<PracticeGridListDetail />} />
        </Routes>
      </div>
    );
  }
}

export default Perform;