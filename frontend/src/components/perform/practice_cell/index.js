import React, { Component, useEffect, useState, useMatch } from "react";
import { useParams } from 'react-router-dom'

export default function PracticeCell(props) {
  const [cellCompletionData, setCellCompletionData] = useState([]);
  const [completedAt, setCompletedAt] = useState();
  const [loaded, setLoaded] = useState(false);
  let cellData = props.cellData;
  let rowData = props.rowData;

  function onClick() {
    console.log("You clicked " + cellData.id + ", creating completion");
    let cellId = cellData.id;
    let currentDate = new Date();
    let datestring = currentDate.getFullYear() + "-" + (currentDate.getMonth()+1) + "-" + currentDate.getDate();
    let postBody = {
      "practice_cell_id": cellId,
      "completion_date": datestring
    }
    fetch("/perform/practice_cell_completion/", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody)

    })      
    .then(response => {
      if (response.status > 400) {
        return setPlaceholder("Something went wrong!");
      }
      return response.json();
    })
    .then(data => {
      // Trigger a refresh of the cell, ideally
      setLoaded(false);
    });
  }
  
  useEffect(() => {
    if(cellData && !loaded) {
      fetch("/perform/practice_cell/"+cellData.id+"/practice_cell_completions/")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setCellCompletionData(data);
        let completion_date = undefined
        if(Array.isArray(data)) {
          data.forEach(row =>  {
            let row_date = undefined
            if(row.completion_date){
              row_date = new Date(row.completion_date)
            }
            if (!completion_date || (row_date > completion_date)) {
              completion_date = row_date
            }
          })
          if(completion_date != null) {
            let datestring = (completion_date.getMonth()+1) + "-" + (completion_date.getDate()+1);
            setCompletedAt(datestring);
          }
        }
        setLoaded(true);
      });
    }
  });
  return (
    <div className={["col",((completedAt) ? 'bg-success' : 'bg-light')].join(" ")} onClick={onClick}>
        {completedAt || (parseFloat((cellData.target_tempo_percentage + 0.5)*rowData.target_tempo).toFixed(0))}
    </div>
  );
}





