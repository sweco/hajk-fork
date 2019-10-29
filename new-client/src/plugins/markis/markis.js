// Generic imports – all plugins need these
import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";

// All plugins need some icon – make sure to pick a relevant one from Material UI Icons
import BugReportIcon from "@material-ui/icons/BugReport";

// Finally plugin-specific imports. Most plugins will need Model, View and Observer.
import MarkisModel from "./MarkisModel";
import MarkisView from "./MarkisView";
import Observer from "react-event-observer";

class Markis extends React.PureComponent {
  constructor(props) {
    super(props);

    this.localObserver = Observer();

    this.sessionId = this.getUrlParams("sid");

    this.localObserver.subscribe("markisEvent", message => {
      console.log("Markis", message);
    });
    this.localObserver.subscribe("markisErrorEvent", message => {
      console.log("MarkisError:", message);
    });

    this.localObserver.subscribe("searchComplete", message => {
      console.log("Sökning på Markisbegrepp färdig.", message);
    });

    this.markisModel = new MarkisModel({
      map: props.map,
      app: props.app,
      localObserver: this.localObserver,
      options: props.options
    });
  }

  getUrlParams(name) {
    var match = RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
  }

  componentDidMount() {
    if (this.sessionId !== undefined && this.sessionId !== null) {
      if (!this.markisModel.isConnected) {
        this.markisModel.connectToHub(this.sessionId);
      }
    }
  }

  render() {
    return (
      <BaseWindowPlugin
        {...this.props} // Pass on all props
        type={this.constructor.name}
        custom={{
          icon: <BugReportIcon />, // Custom icon for this plugin
          title: "Markis", // Custom title, etc
          description: "Markisanslutning",
          height: 450, // Custom height/width etc | Use "auto" for automatic or leave undefined
          width: 400,
          top: undefined, // If undefined, it will fallback to BaseWindowPlugin's defaults
          left: undefined
        }}
      >
        {/* This is the child object of BaseWindowPlugin. It will be displayed
            as content inside the plugin's window. */}
        <MarkisView
          // Here we send some props to the plugin's View.
          // Make sure to ONLY include props that are ACTUALLY USED in the View.
          model={this.markisModel} // We can supply our model
          app={this.props.app} // Or even the whole App
          localObserver={this.localObserver} // And also the Observer, so that those 2 can talk through it
        />
      </BaseWindowPlugin>
    );
  }
}

// Part of API. Make a HOC of our plugin.
export default Markis;
