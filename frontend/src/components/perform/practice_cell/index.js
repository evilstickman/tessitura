import React, { Component, useEffect, useState, useMatch } from "react";
import { useParams } from 'react-router-dom'

export default function PracticeCell(props) {
  const [cellCompletionData, setCellCompletionData] = useState([]);
  const [loaded, setLoaded] = useState(false);
  let cellData = props.cellData;
  
  useEffect(() => {
    if(!cellData && !loaded) {
      fetch("/perform/practice_cell/"+cellData.id+"/practice_cell_completions")
      .then(response => {
        if (response.status > 400) {
          return setPlaceholder("Something went wrong!");
        }
        return response.json();
      })
      .then(data => {
        setCellCompletionData(data);
        setLoaded(true);
      });
    }
  });
  return (
    <span className={cellCompletionData ? 'background-green' : 'background-white'}>
      {cellCompletionData.toString()}
    </span>
  );
}





