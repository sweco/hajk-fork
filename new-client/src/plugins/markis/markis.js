// Generic imports – all plugins need these
import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";

import DesktopWindowsIcon from "@material-ui/icons/DesktopWindows";

import MarkisModel from "./MarkisModel";
import MarkisView from "./MarkisView";
import Observer from "react-event-observer";

class Markis extends React.PureComponent {
  constructor(props) {
    super(props);
    this.localObserver = Observer();

    this.sessionId = this.getUrlParams("sid");

    this.localObserver.subscribe("updateMarkisView", message => {
      props.app.globalObserver.publish("showMarkis", {
        runCallBack: false,
        hideOtherPluginWindows: false
      });
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
    if (this.sessionId) {
      return (
        <BaseWindowPlugin
          {...this.props}
          type="markis"
          custom={{
            icon: <DesktopWindowsIcon />,
            title: "Markiskoppling",
            description: "Markisanslutning",
            height: 315,
            width: 280,
            top: undefined,
            left: undefined
          }}
        >
          <MarkisView
            model={this.markisModel}
            app={this.props.app}
            localObserver={this.localObserver}
          />
        </BaseWindowPlugin>
      );
    } else {
      return <div></div>;
    }
  }
}

export default Markis;
