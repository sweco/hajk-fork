import MatchSearch from "./MatchSearch";
import { v4 as uuidv4 } from "uuid";
import { getStringArray, splitAndTrimOnCommas } from "../utils/helpers";

export default class DocumentSearchModel {
  constructor(settings) {
    this.settings = settings;
    this.featureCollectionsToSearch = this.createDocumentCollectionsToSearch(
      settings.allDocuments
    );
  }

  createDocumentCollectionsToSearch = (allDocuments) => {
    return allDocuments.reduce((featureCollections, document) => {
      const features = this.getFeatures(document.chapters, document);
      return [
        ...featureCollections,
        this.getFeatureCollection(features, document),
      ];
    }, []);
  };

  getFeatureCollection = (features, document) => {
    return {
      value: {
        status: "fulfilled",
        type: "FeatureCollection",
        crs: { type: null, properties: { name: null } },
        features: features,
        numberMatched: 0,
        numberReturned: 0,
        timeStamp: null,
        totalFeatures: 0,
      },
      source: {
        id: document.documentTitle || document.documentFileName,
        caption: document.documentTitle,
        displayFields: ["header"],
        searchFields: [],
      },
      origin: "DOCUMENT",
    };
  };

  getFeatures = (chapters, document) => {
    return chapters.reduce((features, chapter) => {
      if (chapter.chapters) {
        features = [
          ...features,
          ...this.getFeatures(chapter.chapters, document),
        ];
      }
      features = [
        ...features,
        this.createFeatureFromChapter(chapter, document),
      ];
      return features;
    }, []);
  };

  createFeatureFromChapter = (chapter, document) => {
    let searchValues = [];

    if (chapter.header) {
      searchValues.push(chapter.header);
    }
    if (chapter.keywords && chapter.keywords.length > 0) {
      searchValues = [...searchValues, ...chapter.keywords];
    }

    let properties = {
      header: chapter.header,
      geoids: chapter.geoids,
      headerIdentifier: chapter.headerIdentifier,
      documentTitle: document.documentTitle,
      documentFileName: document.documentFileName,
    };

    return {
      type: "Feature",
      geometry: null,
      searchValues: searchValues,
      id: `${chapter.headerIdentifier}${Math.floor(Math.random() * 1000)}`,
      onClickName: "documentHandlerSearchResultClicked",
      internalChapterRef: chapter.id,
      properties: properties,
    };
  };

  implementSearchInterface = () => {
    return {
      getResults: this.getResults,
      getFunctionality: this.getFunctionality,
    };
  };

  // getFunctionality is called by searchComponent in core (Part of searchInterface)
  // The search-component demands this method, and if it is not present in the interface,
  // the plugin will not be used in the search-component at all.
  // The getFunctionality-method is supposed to return an object as follows:
  // return {
  //   name: "TOOL DISPLAY NAME",
  //   icon: TOOL ICON,
  //   type: "EXTERNAL_PLUGIN",
  //   searchFunctionalityClickName: "GLOBAL OBSERVER EVENT NAME",
  // };
  // If we want to make use of the plugin in the search-component regardless (without the functionality)
  // we can just let the method return null.
  getFunctionality = () => {
    return null;
  };

  //Method called by searchComponent in core (Part of searchInterface)
  getResults = (searchString, searchOptions) => {
    this.matchSearch = new MatchSearch(searchOptions);
    this.searchOptions = searchOptions;
    return this.getDocumentHandlerResults(searchString, searchOptions);
  };

  getDocumentHandlerResults = (searchString, searchOptions) => {
    return new Promise((resolve, reject) => {
      if (searchString === "") {
        resolve({ featureCollections: [], errors: [] });
      }
      let possibleSearchCombinations = [];
      if (searchOptions.getPossibleCombinations) {
        possibleSearchCombinations = this.getPossibleSearchCombinations(
          searchString,
          searchOptions
        );
      } else {
        possibleSearchCombinations.push(splitAndTrimOnCommas(searchString));
      }

      resolve({
        featureCollections: this.getFeatureCollectionsForMatchingDocuments(
          possibleSearchCombinations
        ),
        errors: [],
      });
    });
  };

  getSearchFields = (matchedFeatures) => {
    return matchedFeatures.reduce((searchFields, feature) => {
      if (feature.matchedSearchValues.length > 0) {
        searchFields = [
          ...searchFields,
          ...this.getMockedSearchFieldForChapter(feature),
        ];
      }
      return searchFields;
    }, []);
  };

  getMatchedFeatures = (docFeatureCollection, possibleSearchCombinations) => {
    return docFeatureCollection.value.features.reduce(
      (matchedFeatures, feature) => {
        feature.matchedSearchValues = this.getMatchedSearchValues(
          possibleSearchCombinations,
          feature.properties.documentTitle,
          feature.searchValues
        );

        return feature.matchedSearchValues.length > 0
          ? [...matchedFeatures, feature]
          : matchedFeatures;
      },
      []
    );
  };

  getUpdatedFeatureCollection = (
    matchedFeatures,
    searchFields,
    docFeatureCollection
  ) => {
    console.log(docFeatureCollection, "docFeatureCollection");
    return {
      value: {
        status: "fulfilled",
        type: "FeatureCollection",
        crs: { type: null, properties: { name: null } },
        features: matchedFeatures,
        numberMatched: matchedFeatures.length,
        numberReturned: matchedFeatures.length,
        timeStamp: null,
        totalFeatures: matchedFeatures.length,
      },
      source: {
        id: docFeatureCollection.source.documentFileName,
        caption: docFeatureCollection.source.caption,
        displayFields: ["header"],
        searchFields: [...searchFields],
      },
      origin: "DOCUMENT",
    };
  };

  getFeatureCollectionsForMatchingDocuments = (possibleSearchCombinations) => {
    return this.featureCollectionsToSearch.reduce(
      (featureCollections, docFeatureCollection) => {
        const matchedFeatures = this.getMatchedFeatures(
          docFeatureCollection,
          possibleSearchCombinations
        );
        console.log(matchedFeatures, "matchedFeatures");
        const searchFields = this.getSearchFields(matchedFeatures);
        const featureCollection = this.getUpdatedFeatureCollection(
          matchedFeatures,
          searchFields,
          docFeatureCollection
        );

        return featureCollection
          ? [...featureCollections, featureCollection]
          : featureCollections;
      },
      []
    );
  };

  getPossibleSearchCombinations = (searchString) => {
    let possibleSearchCombinations = [[searchString]];
    let wordsInTextField = getStringArray(searchString);

    for (let i = 0; i < wordsInTextField.length; i++) {
      let combination = wordsInTextField.slice(wordsInTextField.length - i);
      let word = wordsInTextField
        .slice(0, wordsInTextField.length - i)
        .join()
        .replace(/,/g, " ");

      combination.unshift(word);
      possibleSearchCombinations.push(combination);
    }
    return possibleSearchCombinations;
  };

  getMockedSearchFieldForChapter = (feature) => {
    return feature.matchedSearchValues.reduce((searchFields, searchValue) => {
      const searchField = uuidv4();
      feature.properties[searchField] = searchValue;
      return [...searchFields, searchField];
    }, []);
  };

  /**
   * Sets matchedsearchvalues for each chapter
   * If any (some-function) of the searchcombinations is hit, that is a match
   * For a searchCombination to be a match must every (every-function) searchword in that combination
   * find a match
   * @param {chapter} chapter chapter.
   * @param {array} searchCombinations array with arrays containing searchwords.
   * @return Returns true if a match is found.
   *
   */
  getMatchedSearchValues = (
    searchCombinations,
    documentTitle,
    searchValues
  ) => {
    let allMatched = new Set();

    let match = searchCombinations.some((searchCombination) => {
      const docexists = searchCombination.some((comb) => {
        return comb.toLowerCase() === documentTitle.toLowerCase();
      });
      console.log(docexists, "docexists");
      if (docexists) {
        searchValues.forEach((x) => {
          console.log(x, "x");
          allMatched.add(x);
        });
        return true;
      } else {
        return searchCombination.every((word) => {
          const matchedSearchValues = this.getMatched(word, searchValues);

          matchedSearchValues.forEach((matched) => {
            allMatched.add(matched);
          });
          return matchedSearchValues.length > 0;
        });
      }
    });
    console.log(Array.from(allMatched), "allmatched");
    return match ? Array.from(allMatched) : [];
  };

  getMatched = (searchString, searchFields) => {
    return searchFields.reduce((matchedSearchFields, searchField) => {
      let match = this.matchSearch.compare(searchString, searchField)
        .searchResults.match;
      if (match) {
        return [...matchedSearchFields, searchField];
      }
      return matchedSearchFields;
    }, []);
  };
}
