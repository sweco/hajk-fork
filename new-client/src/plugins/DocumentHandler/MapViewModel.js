export default class MapViewModel {
  constructor(settings) {
    this.localObserver = settings.localObserver;
    this.globalObserver = settings.globalObserver;
    this.map = settings.map;
    this.bindSubscriptions();
  }

  convertMapSettingsUrlToOlSettings = (inputUrl) => {
    let url = inputUrl.toLowerCase();
    if (url.includes("x=") && url.includes("y=") && url.includes("z=")) {
      let url = inputUrl.split("&");
      let x = url[1].substring(2);
      let y = url[2].substring(2);
      let z = url[3].substring(2);
      let l = url[4]?.substring(2);
      let center = [x, y];
      let zoom = z;
      return {
        center: center,
        zoom: zoom,
        layers: l,
      };
    }
  };

  bindSubscriptions = () => {
    this.localObserver.subscribe("fly-to", (url) => {
      this.globalObserver.publish("core.minimizeWindow");
      this.displayMap(this.convertMapSettingsUrlToOlSettings(url));
    });
  };

  displayMap(mapSettings) {
    //console.log("MapViewModel displayMap");
    let visibleLayers = mapSettings.layers.split(",");
    const layers = this.map.getLayers().getArray();

    //console.log("MapViewModel visibleLayers=", visibleLayers);
    layers
      .filter(
        (layer) =>
          layer.getProperties()["layerInfo"] &&
          layer.getProperties()["layerInfo"]["layerType"] &&
          visibleLayers.includes(layer.getProperties()["name"])
      )
      .forEach((mapLayerToShow) => {
        if (mapLayerToShow.layerType === "group") {
          //console.log("MapViewModel displayMap publishing global observer layerswitcher.showLayer on " + mapLayerToShow.getProperties()["name"]);
          this.globalObserver.publish(
            "layerswitcher.showLayer",
            mapLayerToShow
          );
        } else if (!mapLayerToShow.getVisible()) {
          //console.log("MapViewModel setVisible(true) on " + mapLayerToShow.getProperties()["name"]);
          mapLayerToShow.setVisible(true);
        }
      });
    layers
      .filter(
        (layer) =>
          layer.getProperties()["layerInfo"] &&
          layer.getProperties()["layerInfo"]["layerType"] &&
          !visibleLayers.includes(layer.getProperties()["name"])
      )
      .forEach((mapLayerToHide) => {
        if (mapLayerToHide.layerType === "group") {
          //console.log("MapViewModel displayMap publishing global observer layerswitcher.hideLayer on " + mapLayerToHide.getProperties()["name"]);
          this.globalObserver.publish(
            "layerswitcher.hideLayer",
            mapLayerToHide
          );
        } else if (mapLayerToHide.getVisible()) {
          //console.log("MapViewModel setVisible(false) on " + mapLayerToHide.getProperties()["name"]);
          mapLayerToHide.setVisible(false);
        }
      });

    this.flyTo(this.map.getView(), mapSettings.center, mapSettings.zoom);
  }

  flyTo(view, center, zoom) {
    view.animate({
      center: center,
      zoom: zoom,
      duration: 1500,
    });
    this.localObserver.publish("map-animation-complete");
  }
}
