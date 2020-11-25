import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";
import LegendModel from "./LegendModel";
import LegendGroup from "./LegendGroup";
import LegendView from "./LegendView";
import Observer from "react-event-observer";
import BugReportIcon from "@material-ui/icons/BugReport";
import { useEffect, useState, useMemo } from "react";
import { Tile as TileLayer, Image as ImageLayer } from "ol/layer";
import { useRef } from "react";

const localObserver = new Observer();

const Legend = (props) => {
  const [legendInfo, _setLegendInfo] = useState([]);
  const legendInfoRef = useRef(legendInfo);

  const setLegendInfo = (legendInfo) => {
    legendInfoRef.current = legendInfo;
    _setLegendInfo(legendInfo);
  };

  const getVisibleMapLayers = () => {
    return props.app.map
      .getLayers()
      .getArray()
      .filter((layer) => {
        return layer.getVisible() && layer instanceof ImageLayer; // DEBUG
      });
  };

  const getAllMapLayers = () => {
    console.log(props.app.map.getLayers().getArray(), "???");
    return props.app.map.getLayers().getArray();
  };

  const handleLayerVisibleChange = (e) => {
    let newLegendInfo = [];

    if (e.target.getVisible()) {
      newLegendInfo = [
        ...legendInfoRef.current,
        ...convertLayersToLegendInfo([e.target]),
      ];
    } else {
      console.log(e.target, "target");
      console.log(legendInfoRef.current, "legendINfo");
      legendInfoRef.current.find((info) => {});
    }

    setLegendInfo(newLegendInfo);
  };

  const convertLayersToLegendInfo = (visibleLayers) => {
    //HERE WE NEED TO HANDLE DIFFERENT TYPES OF LAYERS
    return visibleLayers.map((layer) => {
      return {
        caption: layer.get("caption"),
        legendInfo: Object.values(layer.layersInfo).reduce((acc, info) => {
          return { ...acc, ...{ [info.id]: info.legend } };
        }, {}),
      };
    });
  };

  const fireCustomEvent = (e) => {
    if (e.target.subLayers && e.target.subLayers.length > 1) {
      console.log("HANDLE SUBLAYERS");
    } else {
      console.log("HANDLE NORMALLY");
    }
  };

  useEffect(() => {
    const bindSubscriptions = () => {
      getAllMapLayers().forEach((layer) => {
        layer.getSource().set("layerRef", layer);
        layer.on("change:visible", fireCustomEvent);
        layer.getSource().on("change", fireCustomEvent);
      });
      localObserver.subscribe("layer-changed", (e) => {
        //console.log(e, "HEJ");
      });
    };

    bindSubscriptions();
    const visibleLayers = getVisibleMapLayers();
    const legendInfo = convertLayersToLegendInfo(visibleLayers);

    setLegendInfo(legendInfo);
  }, []);

  return (
    <BaseWindowPlugin
      {...props}
      type="Legend"
      custom={{
        icon: <BugReportIcon />,
        title: "Teckenförklaring",
        color: "blue",
        description: "En kort beskrivning som visas i widgeten",
        height: 450,
        width: 400,
      }}
    >
      <LegendView legendInfos={legendInfo}></LegendView>
    </BaseWindowPlugin>
  );
};

export default Legend;
