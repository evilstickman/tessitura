import React, { Component } from "react";
import { 
  Link
} from 'react-router-dom'
import { createRoot } from 'react-dom/client'

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
            <div>
              <Link to={'/perform/practice_grid_display/' + practiceGrid['id']} className='nav-link'>Open</Link>  
            </div>
          </li>
        }
      </div>
    );
  }
}

export default PracticeGridListItem;
