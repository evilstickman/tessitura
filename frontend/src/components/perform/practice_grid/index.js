import React, { Component } from "react";
import { render } from "react-dom";


class PracticeGrid extends Component {

  constructor(props) {
    super(props);
    this.state = {
      data: [],
      loaded: false,
      placeholder: "Loading",
      path: ''
    };
  }

  componentDidMount() {
    let {match, practiceGridId} = this.props;
    fetch("perform/practice_grid/"+practiceGridId+"/practice_rows")
      .then(response => {
        if (response.status > 400) {
          return this.setState(() => {
            return { placeholder: "Something went wrong!" };
          });
        }
        return response.json();
      })
      .then(data => {
        if(match)
        {
          this.setState(() => {
            return {
              data,
              loaded: true,
              path: match.path
            };
          });
        }
        else
        {
          
          this.setState(() => {
            return {
              data,
              loaded: true,
              path: ''
            };
          });
        }
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
              <PracticeGridList />
            </div>
        </div>
      </div>
    );
  }
}

export default PracticeGrid;

const container = document.getElementById("app");
render(<PracticeGrid />, container);