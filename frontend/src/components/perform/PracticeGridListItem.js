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
            <div><strong>{practiceGrid['name']}</strong></div>
            <div>
              <Link to={'/performance_support/practice_grid_display/' + practiceGrid['id']} className='nav-link'>Open</Link>  
            </div>
          </div>
        }
      </div>
    );
}

