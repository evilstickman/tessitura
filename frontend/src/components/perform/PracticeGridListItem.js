import React, { Component } from "react";
import { render } from "react-dom";

class PracticeGridListItem extends Component {
  loadPracticeGrid(event) {
    alert(event.target.getAttribute('gridid'))
  }

  render() {
    const { practiceGrid } = this.props;
    return (
      <div className="practiceGridDetail">
        
        { practiceGrid &&
          <li key={"grid-"+practiceGrid['id']}>
            <div><strong>{practiceGrid['name']}</strong></div>
            <div><button onClick={this.loadPracticeGrid} gridid={practiceGrid['id']}>Open</button></div>
          </li>
        }
      </div>
    );
  }
}

export default PracticeGridListItem;

const container = document.getElementById("app");
render(<PracticeGridListItem />, container);
