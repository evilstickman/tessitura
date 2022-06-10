import React, { Component, useEffect, useState, useMatch } from "react";
import { useParams } from 'react-router-dom'

import PracticeCell from "../practice_cell";

export default function PracticeRow(props) {
  const [cellData, setCellData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  let rowData = props.rowData;
  
  useEffect(() => {
    if(rowData && !loaded) {
      fetch("/perform/practice_row/"+rowData.id+"/practice_cells/")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setCellData(data);
        setLoaded(true);
      });
    }
  });
  //let params=useParams();
  //let rowData = params.rowData;
  //localhost:8000/perform/practice_row/530/practice_cells
  //-- fetch practice grids for user here and list 'em! -->
  return (
      <div className={['row', 'no-gutters'].join(' ')}>
        <div className="col-1">{rowData && rowData.target_tempo}</div>
        <div className="col-1">{rowData && rowData.start_measure}</div>
        <div className="col-1">{rowData && rowData.end_measure}</div>
        { cellData && cellData.map( 
          (cell) => <PracticeCell key={'cell' + cell.id} cellData={cell} />
        )}
      </div>
  );
}