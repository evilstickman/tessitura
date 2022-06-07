import React, { Component } from "react";
import { render } from "react-dom";
import PracticeGridListItem from './PracticeGridListItem'

class PracticeGridList extends Component {
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
    let {match} = this.props;
    fetch("perform/practice_grid")
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
    const { path } = this.state;
    console.log(this.props.match);
    return (
        <div className="container">
          <div className="row">
            <ul>
              {this.state.data && this.state.data.map(practiceGrid => {
                return (
                    <PracticeGridListItem practiceGrid={practiceGrid}  id={practiceGrid['id']} />
                );
              })}
            </ul>
          </div>
        </div>
    );
  }
}

export default PracticeGridList;

const container = document.getElementById("app");
render(<PracticeGridList />, container);
