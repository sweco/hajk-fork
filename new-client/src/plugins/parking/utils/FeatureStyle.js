import { Stroke, Style, Circle as CircleStyle, Fill, Text } from "ol/style.js";
export function getSearchResultStyle() {
  return [
    new Style({
      fill: new Fill({
        color: "rgba(255, 0, 0, 0.5)"
      }),
      stroke: new Stroke({
        color: "rgba(200, 0, 0, 0.5)",
        width: 4
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          width: 2
        })
      })
    })
  ];
}

/**Style for highlighted (selected) features */
export function getDrawStyle() {
  return [
    new Style({
      fill: new Fill({
        color: "rgba(0, 255, 255, 0.5)"
      }),
      stroke: new Stroke({
        color: "rgba(0, 200, 0, 0.5)",
        width: 4
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          width: 2
        })
      })
    })
  ];
}

/**Style for highlighted (selected) features */
export function getHighlightStyle() {
  return [
    new Style({
      fill: new Fill({
        color: "rgba(0, 255, 0, 0.5)"
      }),
      stroke: new Stroke({
        color: "rgba(0, 200, 0, 0.5)",
        width: 4
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.5)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0.5)",
          width: 2
        })
      })
    })
  ];
}

/**Style for hidden features */
export function getHiddenStyle() {
  return [
    new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 0)",
        width: 0
      }),
      fill: new Fill({
        color: "rgba(1, 2, 3, 0)"
      }),
      image: new CircleStyle({
        fill: new Fill({
          color: "rgba(0, 0, 0, 0)"
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0)",
          width: 0
        }),
        radius: 0
      })
    })
  ];
}

/**Style for parking areas in layout */
export function getParkingAreaStyle() {
  return [
    new Style({
      fill: new Fill({
        color: "rgba(0, 255, 0, 0)"
      }),
      stroke: new Stroke({
        color: "rgba(255, 0, 0, 1)",
        width: 2
      })
    })
  ];
}

/**Style for parking spaces in layout */
export function getParkingSpaceStyle(feature) {
  const spaceType = feature.get("kategoriid");
  switch (spaceType) {
    case 0:
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 1
          }),
          fill: new Fill({
            color: "rgba(209, 186, 102, 1)"
          })
        })
      ];
    case 1:
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 1
          }),
          fill: new Fill({
            color: "rgba(35, 219, 176, 1)"
          })
        })
      ];
    case 2:
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 1
          }),
          fill: new Fill({
            color: "rgba(56, 90, 212, 1)"
          })
        })
      ];
    case 3:
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 1
          }),
          fill: new Fill({
            color: "rgba(115, 218, 84, 1)"
          })
        })
      ];
    case 4:
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 1
          }),
          fill: new Fill({
            color: "rgba(203, 112, 228, 1)"
          })
        })
      ];
    default:
      return [
        new Style({
          stroke: new Stroke({
            color: "rgba(0, 0, 0, 1)",
            width: 1
          }),
          fill: new Fill({
            color: "rgba(1, 2, 3, 0)"
          })
        })
      ];
  }
}

/**Style for sign packages in layout */
export function getSignPackageStyle(feature, resolution) {
  return [
    new Style({
      image: new CircleStyle({
        fill: new Fill({
          color: "rgba(2, 14, 254, 1)"
        }),
        stroke: new Stroke({
          color: "rgba(35, 35, 35, 1)",
          width: 2
        }),
        radius: 4
      })
    })
  ];
}

/**Style for sign package labels in layout */
export function getSignPackageLabelStyle(feature, resolution) {
  let labelText = feature.get("index") + "";
  return [
    new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 1)",
        width: 2
      }),
      fill: new Fill({
        color: "rgba(255, 255, 255, 1)"
      }),
      image: new CircleStyle({
        radius: 8,
        stroke: new Stroke({
          color: "rgba(1, 2, 3, 0.9)",
          width: 1
        }),
        fill: new Fill({
          color: "rgba(255, 255, 255, 1)"
        })
      }),
      text: new Text({
        font: "6px Roboto",
        text: labelText,
        fill: new Fill({
          color: "#000000"
        })
      })
    })
  ];
}

/**Style for sign package labels in layout */
export function getLineStyle() {
  return [
    new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 1)",
        width: 2
      }),
      fill: new Fill({
        color: "rgba(255, 255, 255, 1)"
      })
    })
  ];
}
