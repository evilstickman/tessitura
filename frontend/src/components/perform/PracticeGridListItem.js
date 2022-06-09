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

