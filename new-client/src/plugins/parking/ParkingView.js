import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";
import { AppBar } from "@material-ui/core";
import Toolbar from "@material-ui/core/Toolbar";
import MenuIcon from "@material-ui/icons/Menu";
import { Typography } from "@material-ui/core";
import ParkingAreaTools from "./components/ParkingAreaTools";
import ParkingSpaceTools from "./components/ParkingSpaceTools";
import SignPackageTools from "./components/SignPackageTools";
import clsx from "clsx";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import InboxIcon from "@material-ui/icons/MoveToInbox";
import Button from "@material-ui/core/Button";
import List from "@material-ui/core/List";
import { Backdrop, Divider, Drawer, IconButton } from "@material-ui/core";

const styles = theme => ({
  windowContent: {
    margin: -10
  },
  stickyAppBar: {
    top: -10
  },
  tabContent: {
    padding: 10
  },
  menuButton: {
    marginRight: 36
  },
  hide: {
    display: "none"
  },
  drawer: {
    width: 200,
    flexShrink: 0,
    whiteSpace: "nowrap"
  },
  backdrop: {
    zIndex: theme.zIndex.drawer - 1
  }
});

class ParkingView extends React.PureComponent {
  state = {
    drawerVisible: false,
    activeTool: 0
  };

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.model = this.props.model;
    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;
    this.toolNames = this.props.options.toolNames;

    this.localObserver.subscribe("messageEvent", message => {
      this.showAdvancedSnackbar(message.message, message.variant);
    });
  }

  showAdvancedSnackbar = (message, variant) => {
    const action = key => (
      <>
        <Button
          onClick={() => {
            this.props.closeSnackbar(key);
          }}
        >
          {"Stäng"}
        </Button>
      </>
    );

    this.props.enqueueSnackbar(message, {
      variant: variant || "error",
      autoHideDuration: 7000,
      persist: false,
      action
    });
  };

  renderParkingAreaTools() {
    return (
      <div>
        <ParkingAreaTools
          model={this.model}
          app={this.props.app}
          localObserver={this.localObserver}
        />
      </div>
    );
  }

  renderParkingSpaceTools() {
    return (
      <div>
        <ParkingSpaceTools
          model={this.model}
          app={this.props.app}
          localObserver={this.localObserver}
        />
      </div>
    );
  }

  renderSignPackageTools() {
    return (
      <div>
        <SignPackageTools
          model={this.model}
          app={this.props.app}
          localObserver={this.localObserver}
        />
      </div>
    );
  }

  renderTicketMachineTools() {
    return (
      <div>
        <Typography>Biljettautomatverktyg</Typography>
      </div>
    );
  }

  toggleDrawer = open => event => {
    this.setState({ drawerVisible: open });
  };

  handleItemChosen(value) {
    this.setState({ activeTool: value, drawerVisible: false });
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <div className={classes.windowContent}>
          <AppBar
            position="sticky"
            color="default"
            className={classes.stickyAppBar}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={this.toggleDrawer(!this.state.drawerVisible)}
                edge="start"
                className={clsx(classes.menuButton, {
                  [classes.hide]: this.state.drawerVisible
                })}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap>
                {this.toolNames[this.state.activeTool]}
              </Typography>
            </Toolbar>
          </AppBar>
          <div className={classes.tabContent}>
            <Drawer
              className={classes.drawer}
              variant="persistent"
              anchor="left"
              open={this.state.drawerVisible}
              classes={{
                paper: classes.drawerPaper
              }}
            >
              <Divider />
              <List>
                {this.toolNames.map((toolName, index) => {
                  return (
                    <ListItem
                      button
                      key={index}
                      value={index}
                      divider={true}
                      onClick={() => this.handleItemChosen(index)}
                    >
                      <ListItemIcon>
                        <InboxIcon />
                      </ListItemIcon>
                      <ListItemText primary={toolName} />
                    </ListItem>
                  );
                })}
                <Divider />
              </List>
            </Drawer>
            <Backdrop
              open={this.state.drawerVisible}
              className={classes.backdrop}
              onClick={this.toggleDrawer(!this.state.drawerVisible)}
            />
            {this.state.activeTool === 0 && this.renderParkingAreaTools()}
            {this.state.activeTool === 1 && this.renderParkingSpaceTools()}
            {this.state.activeTool === 2 && this.renderSignPackageTools()}
            {this.state.activeTool === 3 && this.renderTicketMachineTools()}
          </div>
        </div>
      </>
    );
  }
}

export default withStyles(styles)(withSnackbar(ParkingView));
