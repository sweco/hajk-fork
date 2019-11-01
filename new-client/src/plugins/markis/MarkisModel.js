import * as signalR from "@microsoft/signalr";
import { WFS } from "ol/format";
import GeometryType from "ol/geom/GeometryType";
import IsLike from "ol/format/filter/IsLike";
import Or from "ol/format/filter/Or";
import Intersects from "ol/format/filter/Intersects";
import TileLayer from "ol/layer/Tile";
import ImageLayer from "ol/layer/Image";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromCircle } from "ol/geom/Polygon";
import Draw from "ol/interaction/Draw.js";
import { arraySort } from "./../../utils/ArraySort.js";
import { Stroke, Style, Circle, Fill, Icon } from "ol/style.js";

var style = new Style({
  stroke: new Stroke({
    color: "rgba(244, 83, 63, 1)",
    width: 4
  }),
  fill: new Fill({
    color: "rgba(244, 83, 63, 0.2)"
  }),
  //Setting image in constructor to MarkerImage - this is default style
  image: new Circle({
    radius: 6,
    stroke: new Stroke({
      color: "rgba(0, 0, 0, 0.6)",
      width: 2
    })
  })
});

var drawStyle = new Style({
  stroke: new Stroke({
    color: "rgba(255, 214, 91, 0.6)",
    width: 4
  }),
  fill: new Fill({
    color: "rgba(255, 214, 91, 0.2)"
  }),
  image: new Circle({
    radius: 6,
    stroke: new Stroke({
      color: "rgba(255, 214, 91, 0.6)",
      width: 2
    })
  })
});

class MarkisModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.localObserver = settings.localObserver;

    this.hubUrl = settings.options.hubUrl;
    this.isConnected = false;
    this.connection = undefined;
    this.sources = settings.options.sources;
    this.wfsParser = new WFS();
    this.controllers = [];
    this.globalObserver = settings.globalObserver;
    this.vectorLayer = new VectorLayer({
      source: new VectorSource({}),
      style: () => {
        if (settings.options.markerImg && settings.options.markerImg !== "") {
          style.setImage(
            new Icon({
              src: settings.options.markerImg
            })
          );
        }
        return style;
      }
    });
    this.vectorLayer.set("type", "markisResultLayer");
    this.vectorLayer.set("queryable", true);
    this.drawSource = new VectorSource({ wrapX: false });
    this.drawLayer = new VectorLayer({
      source: this.drawSource,
      style: drawStyle
    });
    this.map.addLayer(this.vectorLayer);
    this.map.addLayer(this.drawLayer);
  }

  getMap() {
    return this.map;
  }

  getConnection() {
    return this.connection;
  }

  connectToHub(sessionId) {
    this.sessionId = sessionId;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl + "?sid=" + sessionId + "")
      .build();
    console.log(this.connection);

    this.connection
      .start()
      .then(
        function() {
          this.isConnected = true;
          console.log("Connected to hub!");
        }.bind(this)
      )
      .catch(
        function() {
          console.log("Connection to hub failed");
        }.bind(this)
      );

    this.connection.on(
      "ShowContractFromMarkis",
      function(_, showMessage) {
        this.localObserver.publish("toggleCreateButton", { enabled: false });
        console.log("Recieved show message:", showMessage);
        var showObj = JSON.parse(showMessage);
        if (showObj.objectid) {
          this.localObserver.publish("toggleView", "visningsläge");
          this.localObserver.publish("updateContractInformation", {
            objectId: showObj.objectid,
            objectType: ""
          });
          this.doSearch(showObj.objectid);
        } else {
          this.localObserver.publish(
            "markisErrorEvent",
            "Markis skickade ej giltligt avtalsnummer"
          );
        }
      }.bind(this)
    );

    this.connection.on(
      "CreateContractFromMarkis",
      function(_, createMessage) {
        console.log("Recieved create message: ", createMessage);
        var createObject = JSON.parse(createMessage);
        if (createObject.objectid && createObject.objecttype) {
          this.search(createObject.objectid, result => {
            if (this.getNumberOfResults(result) > 0) {
              this.localObserver.publish(
                "contractAlreadyExistsError",
                "Avtalet som du försöker skapa en ny geometri för finns redan!"
              );
              this.highlightImpact(result);
              this.localObserver.publish("toggleView", "visningsläge");
              this.localObserver.publish("updateContractInformation", {
                objectId: createObject.objectid,
                objectType: ""
              });
              this.localObserver.publish("toggleCreateButton", {
                enabled: false
              });
            } else {
              this.vectorLayer.getSource().clear();
              this.localObserver.publish("toggleView", "editeringsläge");
              this.localObserver.publish("updateContractInformation", {
                objectId: createObject.objectid,
                objectType: createObject.objecttype
              });
              this.localObserver.publish("toggleCreateButton", {
                enabled: true
              });
            }
          });
        } else {
          this.localObserver.publish(
            "markisErrorEvent",
            "Markis skickade ej giltligt avtalsnummer eller typ"
          );
        }
      }.bind(this)
    );
  }

  disconnectHub() {
    console.log("Disconnecting from hub!");
    this.connection
      .stop()
      .then(
        function() {
          this.isConnected = false;
        }.bind(this)
      )
      .catch(
        function() {
          console.log("Disconnection from hub failed");
        }.bind(this)
      );
  }

  lookUp(source, searchInput) {
    const projCode = this.map
      .getView()
      .getProjection()
      .getCode();

    var isLikeFilters = source.searchFields.map(searchField => {
      return new IsLike(
        searchField,
        searchInput + "*",
        "*", // wild card
        ".", // single char
        "!", // escape char
        false // match case
      );
    });

    var filter =
      isLikeFilters.length > 1 ? new Or(...isLikeFilters) : isLikeFilters[0];

    const options = {
      featureTypes: source.layers,
      srsName: projCode,
      outputFormat: "JSON", //source.outputFormat,
      geometryName: source.geometryField,
      maxFeatures: 100,
      filter: filter
    };

    const node = this.wfsParser.writeGetFeature(options);
    const xmlSerializer = new XMLSerializer();
    const xmlString = xmlSerializer.serializeToString(node);
    const controller = new AbortController();
    const signal = controller.signal;

    const request = {
      credentials: "same-origin",
      signal: signal,
      method: "POST",
      headers: {
        "Content-Type": "text/xml"
      },
      body: xmlString
    };
    const promise = fetch(
      this.app.config.appConfig.searchProxy + source.url,
      request
    );

    return { promise, controller };
  }

  search(searchInput, callback) {
    this.timeout = setTimeout(() => {
      this.vectorLayer.getSource().clear();
      var promises = [];
      this.controllers.splice(0, this.controllers.length);

      this.sources.forEach(source => {
        const { promise, controller } = this.lookUp(source, searchInput);
        promises.push(promise);
        this.controllers.push(controller);
      });

      Promise.all(promises)
        .then(responses => {
          Promise.all(responses.map(result => result.json()))
            .then(jsonResults => {
              jsonResults.forEach((jsonResult, i) => {
                if (jsonResult.features.length > 0) {
                  arraySort({
                    array: jsonResult.features,
                    index: this.sources[i].searchFields[0]
                  });
                }
                jsonResult.source = this.sources[i];
              });
              jsonResults = jsonResults.filter(function(e) {
                return e.features.length > 0;
              });
              setTimeout(() => {
                return this.localObserver.publish("searchComplete");
              }, 500);
              if (callback) callback(jsonResults);
            })
            .catch(parseErrors => {});
        })
        .catch(responseErrors => {});
    }, 200);
  }

  doSearch(v) {
    if (v.length <= 3) return null;
    this.search(v, d => {
      var numHits = this.getNumberOfResults(d);
      if (numHits !== 1) {
        this.localObserver.publish(
          "markisErrorEvent",
          "Antal sökträffar från Markis: " + numHits
        );
        this.highlightImpact(d);
      } else {
        this.highlightImpact(d);
        this.localObserver.publish(
          "markisSearchComplete",
          "Sökbegreppet " + v + " hittades!"
        );
      }
    });
  }

  getNumberOfResults = result => {
    return result.reduce((accumulated, result) => {
      return accumulated + result.features.length;
    }, 0);
  };

  highlightImpact(result) {
    var olFeatures = new GeoJSON().readFeatures(result[0]);
    this.vectorLayer.getSource().addFeatures(olFeatures);
    var extent = this.vectorLayer.getSource().getExtent();
    this.map.getView().fit(extent, this.map.getSize());
    this.vectorLayer.setVisible(true);
  }
}

export default MarkisModel;
