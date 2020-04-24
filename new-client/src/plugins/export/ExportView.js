import React from "react";
import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import ExportPdfSettings from "./components/ExportPdfSettings.js";
import ExportTiffSettings from "./components/ExportTiffSettings.js";

const styles = theme => ({
  windowContent: {
    margin: -10 // special case, we need to "unset" the padding for Window content that's set in Window.js
  },
  stickyAppBar: {
    top: -10
  },
  tabContent: {
    padding: 10
  }
});

class ExportView extends React.PureComponent {
  constructor(props) {
    super(props);
    this.model = props.model;
    this.localObserver = props.localObserver;
    this.state = {
      activeTab: 0
    };
  }

  handleChangeTabs = (event, activeTab) => {
    this.setState({ activeTab });
    this.localObserver.publish("showPreviewLayer");
  };

  handleTabsMounted = ref => {
    // Not beautiful but it works - timeout is needed to ensure rendering is done
    // and parent's element are correct.
    setTimeout(() => {
      ref.updateIndicator();
    }, 1);
  };

  renderPdfExport() {
    return (
      <div>
        <ExportPdfSettings
          model={this.model}
          localObserver={this.localObserver}
        />
      </div>
    );
  }

  renderTiffExport() {
    return (
      <div>
        <ExportTiffSettings
          model={this.model}
          localObserver={this.localObserver}
        />
      </div>
    );
  }

  render() {
    const { classes } = this.props;
    const { activeTab } = this.state;
    return (
      <div className={classes.windowContent}>
        <AppBar
          position="sticky"
          color="default"
          className={classes.stickyAppBar}
        >
          <Tabs
            action={this.handleTabsMounted}
            indicatorColor="primary"
            onChange={this.handleChangeTabs}
            textColor="primary"
            value={activeTab}
            variant="fullWidth"
          >
            <Tab label="PDF" />
            <Tab label="TIFF" />
          </Tabs>
        </AppBar>
        <div className={classes.tabContent}>
          {activeTab === 0 && this.renderPdfExport()}
          {activeTab === 1 && this.renderTiffExport()}
        </div>
      </div>
    );
  }
}
ExportView.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(ExportView);
