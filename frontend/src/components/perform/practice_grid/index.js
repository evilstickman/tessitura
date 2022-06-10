import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom'
import PracticeRow  from "../practice_row";

export default function PracticeGrid() {
  const [rowData, setRowData] = useState([]);
  const [gridData, setGridData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState("Loading");
  let params=useParams();
  let gridId = params.gridId;
  let practiceGrid = params.practiceGrid;
  
  useEffect(() => {
    if(gridId && !loaded) {
      fetch("/perform/practice_grid/"+gridId)
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setGridData(data);
        setLoaded(true);
      });
      fetch("/perform/practice_grid/"+gridId+"/practice_rows/")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setRowData(data);
        setLoaded(true);
      });
    }
  });
  //-- fetch practice grids for user here and list 'em! -->
  return (
    <div id='practice-grid-detail'>
      <div>
      {!loaded && <h2>{placeholder}</h2>}
      </div>
      {loaded && (
        <div>
        <h2>{gridData && gridData.name}</h2>
        <h3>{gridData && gridData.notes}</h3>
        <table className="practiceGridField">
          <thead>
            <tr>
              <th>Target Tempo</th>
              <th>Start measure</th>
              <th>End Measure</th>
            </tr>
          </thead>
          <tbody>
            { rowData.map ( (row) => <PracticeRow key={'row' + row.id} rowData={row} /> )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
  
}