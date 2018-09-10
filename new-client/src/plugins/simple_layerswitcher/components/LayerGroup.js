import React, { Component } from "react";
import LayerItem from "./LayerItem.js";
import "./LayerGroup.css";
import { withStyles } from '@material-ui/core/styles';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
  root: {
    width: '100%',
    display: 'block',
    padding: 0
  },
  heading: {
    fontSize: theme.typography.pxToRem(18),    
    flexBasis: '100%',
    flexShrink: 0,
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
});

class LayerGroup extends Component {
  constructor() {
    super();
    this.state = {
      expanded: false,
      groups: [],
      layers: [],
      name: "",
      parent: "-1",
      toggled: false
    };
    this.toggleExpanded = this.toggleExpanded.bind(this);
  }

  componentWillMount() {
    this.setState({
      ...this.state,
      ...this.props.group
    });
    this.model = this.props.model;
  }
  
  handleChange = panel => (event, expanded) => {        
    this.setState({
      expanded: expanded ? panel : false,
    });
  };

  renderLayerGroups() {
    const { expanded } = this.state;
    const { classes } = this.props;
    return this.state.groups.map((group, i) => {
      return <LayerGroup expanded={expanded === group.id} key={i} group={group} model={this.model} 
        handleChange={this.handleChange} classes={classes}
      />
    });
  }

  toggleExpanded() {
    this.setState({ expanded: !this.state.expanded });
  }

  getExpandedClass() {
    return this.state.expanded
      ? "layer-group-items visible"
      : "layer-group-items hidden";
  }

  getArrowClass() {
    return this.state.expanded ? "expand_less" : "chevron_right";
  }  

  render() {
    const { classes } = this.props;    
    return (
      <div className="layer-group">
        <ExpansionPanel expanded={this.props.expanded} onChange={this.props.handleChange(this.props.group.id)}>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>{this.state.name}</Typography>          
          </ExpansionPanelSummary>
          <ExpansionPanelDetails classes={{root: classes.root}}>          
            {this.state.layers.map((layer, i) => {
              var mapLayer = this.model.layerMap[Number(layer.id)];
              if (mapLayer) {
                return (                
                  <LayerItem key={i} layer={mapLayer} />                
                );
              } else {
                return null;
              }
            })}
          </ExpansionPanelDetails>
          {this.renderLayerGroups()}
        </ExpansionPanel>      
      </div>
    );
  }
}

export default withStyles(styles)(LayerGroup);