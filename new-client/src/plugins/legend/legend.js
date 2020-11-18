import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";
import LegendModel from "./LegendModel";
import LegendView from "./LegendView";
import Observer from "react-event-observer";
import BugReportIcon from "@material-ui/icons/BugReport";

const localObserver = new Observer();
const legendModel = new LegendModel();

const Legend = (props) => {
  return (
    <BaseWindowPlugin
      {...props}
      type="Legend"
      custom={{
        icon: <BugReportIcon />,
        title: "Legend",
        color: "blue",
        description: "En kort beskrivning som visas i widgeten",
        height: 450,
        width: 400,
      }}
    >
      <LegendView
        model={legendModel}
        app={props.app}
        localObserver={localObserver}
      />
    </BaseWindowPlugin>
  );
};

export default Legend;
