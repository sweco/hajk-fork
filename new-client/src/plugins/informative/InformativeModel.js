const url = "/informative/load/op";

class InformativeModel {
  constructor(settings) {
    this.olMap = settings.map;
    this.url =
      settings.app.config.appConfig.proxy +
      settings.app.config.appConfig.mapserviceBase +
      url;
  }

  flyTo(view, location, zoom) {
    const duration = 1500;
    view.animate({
      zoom: zoom,
      center: location,
      duration: duration
    });
  }

  displayMap(visibleLayers, mapSettings) {
    var layers = this.olMap.getLayers().getArray();
    layers
      .filter(
        layer =>
          layer.getProperties()["layerInfo"] &&
          layer.getProperties()["layerInfo"]["layerType"] !== "base"
      )
      .forEach(layer => {
        if (
          visibleLayers.some(
            visibleLayer => visibleLayer === layer.getProperties()["name"]
          )
        ) {
          layer.setVisible(true);
        } else {
          layer.setVisible(false);
        }
      });

    this.flyTo(this.olMap.getView(), mapSettings.center, mapSettings.zoom);
  }

  setRootChapter(rootChapter, chapters) {
    chapters.forEach(childChapter => {
      childChapter.rootChapter = rootChapter;
      if (childChapter.chapters.length > 0) {
        this.setRootChapter(rootChapter, childChapter.chapters);
      }
    });
  }

  load(callback) {
    fetch(this.url).then(response => {
      response.json().then(data => {
        data.chapters.forEach(chapter => {
          this.setRootChapter(chapter, chapter.chapters);
        });
        callback(data.chapters);
        this.chapters = data.chapters;
      });
    });
  }
}

export default InformativeModel;
