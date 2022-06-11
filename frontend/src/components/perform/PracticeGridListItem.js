import React, { Component } from "react";
import { 
  Link,
  useParams
} from 'react-router-dom'


export default function PracticeGridListItem(props) {
    let practiceGrid = props.practiceGrid;
    return (
      <div className="practiceGridDetail">
        
        { practiceGrid &&
          <div className="list-group-item">
            <div className="row">
            <Link to={'/performance_support/practice_grid_display/' + practiceGrid['id']} className='nav-link'><strong className="col-8">{practiceGrid['name']}</strong></Link>
            </div>
          </div>
        }
      </div>
    );
}

