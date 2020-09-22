import { WFS } from "ol/format";
import IsLike from "ol/format/filter/IsLike";
import EqualTo from "ol/format/filter/EqualTo";
import Or from "ol/format/filter/Or";
import And from "ol/format/filter/And";
import Intersects from "ol/format/filter/Intersects";
import Within from "ol/format/filter/Within";
import { fromCircle } from "ol/geom/Polygon";

import { arraySort } from "../utils/ArraySort";

class SearchModel {
  // Public field declarations (why? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Defining_classes)

  // Private fields (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Class_fields#Private_fields)
  #searchOptions = {
    activeSpatialFilter: "intersects", // Make it possible to control which filter is used
    featuresToFilter: [], // features, who's geometries will be read and used to limit the search extent
    maxResultsPerDataset: 100, // how many results to get (at most), per dataset
    matchCase: false, // should search be case sensitive?
    wildcardAtStart: false, // should the search string start with the wildcard character?
    wildcardAtEnd: true, // should the search string be end with the wildcard character?
  };

  #componentOptions;
  #searchSources;
  #map;
  #app;

  #controllers = []; // Holder Array for Promises' AbortControllers
  #wfsParser = new WFS();

  constructor(searchPluginOptions, map, app) {
    // Validate
    if (!searchPluginOptions || !map || !app) {
      throw new Error(
        "One of the required parameters for SearchModel is missing."
      );
    }

    this.#componentOptions = searchPluginOptions; // FIXME: Options, currently from search plugin
    this.#map = map; // The OpenLayers map instance
    this.#app = app; // Supplies appConfig and globalObserver
    this.#searchSources = this.#componentOptions.sources;
  }

  getResults = async (
    searchString,
    searchSources = this.getSources(),
    searchOptions = this.getSearchOptions()
  ) => {
    const { featureCollections, errors } = await this.#getRawResults(
      searchString,
      searchSources,
      searchOptions
    );

    return { featureCollections, errors };
  };

  abort = () => {
    if (this.#controllers.length > 0) {
      this.#controllers.forEach((controller) => {
        controller.abort();
      });
    }

    // Clean up our list of AbortControllers
    this.#controllers = [];
    return true;
  };

  getSearchOptions = () => {
    return this.#searchOptions;
  };

  getSources = () => {
    return this.#searchSources;
  };

  #getRawResults = async (
    searchString = "",
    searchSources = this.getSources(),
    searchOptions = null
  ) => {
    // If searchSources is explicitly provided as an empty Array, something's wrong. Abort.
    if (Array.isArray(searchSources) && searchSources.length === 0) {
      throw new Error("No search sources selected, aborting.");
    }

    // If searchSources is something else than an Array, use the default search sources.
    if (Array.isArray(searchSources) === false) {
      console.warn("searchSources empty, resetting to default.", searchSources);
      searchSources = this.getSources();
    }

    // Will hold our Promises, one for each search source
    const promises = [];

    // Will hold the end results
    let rawResults = null;

    // Ensure that we've cleaned obsolete AbortControllers before we put new ones there
    this.#controllers = [];

    // Loop through all defined search sources
    searchSources.forEach((searchSource) => {
      // Expect the Promise and an AbortController from each Source
      const { promise, controller } = this.#lookup(
        searchString,
        searchSource,
        searchOptions
      );

      // Push promises to local Array so we can act when all Promises have resolved
      promises.push(promise);

      // Also, put AbortController to the global collection of controllers, so we can abort searches at any time
      this.#controllers.push(controller);
    });

    // Start fetching, allow both fulfilled and rejected Promises
    const fetchResponses = await Promise.allSettled(promises);

    // fetchedResponses will be an array of Promises in object form.
    // Each object will have a "status" and a "value" property.
    const jsonResponses = await Promise.allSettled(
      fetchResponses.map((fetchResponse) => {
        // We look at the status and filter out only those that fulfilled.
        if (fetchResponse.status === "rejected")
          Promise.reject("Could not fetch");
        // The Fetch Promise might have fulfilled, but it doesn't mean the Response
        // can be parsed with JSON (i.e. errors from GeoServer will arrive as XML),
        // so we must be careful before invoking .json() on our Response's value.
        if (typeof fetchResponse.value.json !== "function")
          Promise.reject("Fetched result is not JSON");
        // If Response can be parsed as JSON, return it.
        return fetchResponse.value.json();
      })
    );

    let featureCollections = [];
    let errors = [];

    jsonResponses.forEach((r, i) => {
      if (r.status === "fulfilled") {
        r.source = searchSources[i];
        r.origin = "WFS";
        featureCollections.push(r);
      } else if ((r) => r.status === "rejected") {
        r.source = searchSources[i];
        r.origin = "WFS";
        errors.push(r);
      }
    });

    // Do some magic on our valid results
    featureCollections.forEach((featureCollection, i) => {
      if (featureCollection.value.features.length > 0) {
        // FIXME: Investigate if this sorting is really needed, and if so, if we can find some Unicode variant and not only for Swedish characters
        arraySort({
          array: featureCollection.value.features,
          index: featureCollection.source.searchFields[0],
        });
      }
    });

    // Return an object with out results and errors
    rawResults = { featureCollections, errors };

    console.log("getRawResults() => ", rawResults);
    return rawResults;
  };

  #getAllSearchCombinations = (searchString) => {
    let searchWords = searchString.split(",").join(" ").split(" ");

    let searchCombinations = [];

    for (var i = 0; i < searchWords.length; i++) {
      let currentWord = searchWords[i];

      for (var j = 1; j <= searchWords.length - i; j++) {
        searchCombinations.push(currentWord);
        currentWord = currentWord.concat(` ${searchWords[i + j]}`);
      }
    }

    return searchCombinations;
  };

  getAndFilter = (wordsArray, searchSource, searchOptions) => {
    return new And(
      ...wordsArray.map((word) => {
        return new Or(
          ...searchSource.searchFields.map((searchField) => {
            return new IsLike(
              searchField,
              word,
              "*", // wildcard char
              ".", // single char
              "!", // escape char
              searchOptions.matchCase // match case
            );
          })
        );
      })
    );
  };

  #lookup = (searchString, searchSource, searchOptions) => {
    const srsName = this.#map.getView().getProjection().getCode();
    const geometryName =
      searchSource.geometryField || searchSource.geometryName || "geom";
    const maxFeatures = searchOptions.maxResultsPerDataset;
    let comparisonFilters = null;
    let spatialFilters = null;
    let finalFilters = null;

    //let searchWords = this.#getAllSearchCombinations(searchString);

    //if (searchString?.length > 0) {
    // If search string contains only numbers, let's do an EqualTo search
    /* if (/^\d+$/.test(searchString.trim())) {
        comparisonFilters = searchSource.searchFields.map((propertyName) => {
          return new EqualTo(propertyName, Number(searchString));
        });
      }
      // Else, let's do a IsLike search
      else {*/
    // Should the search string be surrounded by wildcard?
    let wordsInTextField = searchString.split(",").join(" ").split(" ");
    let searchArrays = [];
    searchArrays.push(wordsInTextField.join(" "));

    for (var i = 0; i < wordsInTextField.length; i++) {
      searchArrays.push([
        wordsInTextField.slice(0, i),
        wordsInTextField.slice(i + 1).join(" "),
      ]);
    }

    console.log("searchArrays: ", searchArrays);

    let wordsArray = wordsInTextField.map((searchWord) => {
      let pattern = searchWord;
      pattern = searchOptions.wildcardAtStart ? `*${pattern}` : pattern;
      pattern = searchOptions.wildcardAtEnd ? `${pattern}*` : pattern;
      return pattern;
    });

    let allAndFilters = [];

    /*allAndFilters.push(
      this.getAndFilter([searchString], searchSource, searchOptions)
    );*/
    /*
    allAndFilters.push(
      this.getAndFilter(wordsArray, searchSource, searchOptions)
    );
*/

    // Each searchSource (e.g. WFS layer) will have its own searchFields
    // defined (e.g. columns in the data table, such as "name" or "address").
    // Let's loop through the searchFields and create an IsLike filter
    // for each one of them (e.g. "name=bla", "address=bla").

    // Depending on the searchSource configuration, we will now have 1 or more
    // IsLike filters created. If we just have one, let's use it. But if we have
    // many, we must combine them using an Or filter, so we tell the WFS to search
    // where "name=bla OR address=bla OR etc...".

    // If searchOptions contain any features, we should filter the results
    // using those features.
    if (searchOptions.featuresToFilter.length > 0) {
      // First determine which spatial filter should be used:
      const activeSpatialFilter =
        searchOptions.activeSpatialFilter === "within" ? Within : Intersects;
      // Next, loop through supplied features and create the desired filter
      spatialFilters = searchOptions.featuresToFilter.map((feature) => {
        // Convert circle feature to polygon
        let geometry = feature.getGeometry();
        if (geometry.getType() === "Circle") {
          geometry = fromCircle(geometry);
        }
        return new activeSpatialFilter(geometryName, geometry, srsName);
      });

      // If one feature was supplied, we end up with one filter. Let's use it.
      // But if more features were supplied, we must combine them into an Or filter.
      spatialFilters =
        spatialFilters.length > 1
          ? new Or(...spatialFilters)
          : spatialFilters[0];
    }

    // Finally, let's combine the text and spatial filters into
    // one filter that will be sent with the request.
    if (comparisonFilters !== null && spatialFilters !== null) {
      // We have both text and spatial filters - let's combine them with an And filter.
      finalFilters = new And(comparisonFilters, spatialFilters);
    } else if (comparisonFilters !== null) {
      finalFilters = comparisonFilters;
    } else if (spatialFilters !== null) {
      finalFilters = spatialFilters;
    }

    // Prepare the options for the upcoming request.
    const options = {
      featureTypes: searchSource.layers,
      srsName: srsName,
      outputFormat: "JSON", //source.outputFormat,
      geometryName: geometryName,
      maxFeatures: maxFeatures,
      filter: finalFilters,
    };

    const node = this.#wfsParser.writeGetFeature(options);
    const xmlSerializer = new XMLSerializer();
    const xmlString = xmlSerializer.serializeToString(node);
    const controller = new AbortController();
    const signal = controller.signal;

    const request = {
      credentials: "same-origin",
      signal: signal,
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: xmlString,
    };
    const promise = fetch(
      this.#app.config.appConfig.searchProxy + searchSource.url,
      request
    );

    return { promise, controller };
  };
}

export default SearchModel;
