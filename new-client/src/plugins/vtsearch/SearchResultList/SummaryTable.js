import React from "react";
import { withStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import VirtualizedTable from "./VirtualizedTable";
import { transformWithProjections } from "ol/proj";

const styles = theme => ({
  paper: { height: 240, marginBottom: 10, boxShadow: "none" }
});

/**
 * @summary Table used to show summary for journeys
 * @description Table used to show a summary when the user search
 * for the type Journeys
 * @class SummaryTable
 * @extends {React.Component}
 */
class SummaryTable extends React.Component {
  state = {
    rows: this.getRows()
  };

  constructor(props) {
    super(props);
    this.height = this.getSummarizationHeight() + "px";
  }

  getSummarizationHeight() {
    const { rowHeight } = this.props;
    return this.getSummarization().length * rowHeight + 50;
  }

  getColumns() {
    return [
      {
        width: 300,
        label: "OPERATÖR",
        dataKey: "operator"
      },
      { width: 800, label: "LINJER", dataKey: "lines" }
    ];
  }

  getConcatenatedLinesString({ publicLineNames, internalLineNumbers }) {
    return ` ${publicLineNames.map((name, index) => {
      return ` ${name} (${internalLineNumbers[index]})`;
    })}`;
  }

  getRows() {
    return this.getSummarization().map(transportCompany => {
      return {
        operator: transportCompany.transportCompany,
        lines: this.getConcatenatedLinesString(transportCompany)
      };
    });
  }

  getDistinctTransportCompanies() {
    const { searchResult } = this.props;
    return Array.from(
      new Set(
        searchResult.featureCollection.features.map(feature => {
          return feature.properties.TransportCompany;
        })
      )
    );
  }

  getTransportCompaniesWithLinesAdded(transportCompany) {
    const { searchResult } = this.props;

    var transportCompaniesAndTheirLines = {
      publicLineNames: [],
      internalLineNumbers: [],
      transportCompany: transportCompany
    };
    searchResult.featureCollection.features.forEach(feature => {
      const { PublicLineName, InternalLineNumber } = feature.properties;
      if (feature.properties.TransportCompany === transportCompany) {
        if (
          transportCompaniesAndTheirLines.publicLineNames.indexOf(
            PublicLineName
          ) === -1 &&
          transportCompaniesAndTheirLines.internalLineNumbers.indexOf(
            InternalLineNumber
          ) === -1
        ) {
          transportCompaniesAndTheirLines.publicLineNames.push(
            feature.properties.PublicLineName
          );
          transportCompaniesAndTheirLines.internalLineNumbers.push(
            feature.properties.InternalLineNumber
          );
        }
      }
    });
    return transportCompaniesAndTheirLines;
  }

  getSummarization() {
    var summary = [];
    this.getDistinctTransportCompanies().forEach(transportCompany => {
      summary.push(this.getTransportCompaniesWithLinesAdded(transportCompany));
    });
    return summary;
  }

  render = () => {
    const { classes, windowWidth, rowHeight } = this.props;
    console.log(this.state, "thisstate");
    return (
      <Paper
        className={classes.paper}
        style={{ width: windowWidth, height: this.height }}
      >
        <VirtualizedTable
          rowCount={this.state.rows.length}
          rowHeight={rowHeight}
          rowGetter={({ index }) => this.state.rows[index]}
          columns={this.getColumns()}
          sortable={false}
        />
      </Paper>
    );
  };
}

export default withStyles(styles)(SummaryTable);