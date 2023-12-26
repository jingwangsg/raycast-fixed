import { ActionPanel, Action, List, Icon, Color, showToast, Toast, showHUD, popToRoot, Clipboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useRef, useCallback } from "react";
import { URLSearchParams } from "node:url";
import { formatDistanceToNow } from "date-fns";
import natural from "natural";
import { SearchResult, SearchListItemProps } from "./types";
import { parseResponse } from "./utils";
import fetch, { AbortError } from "node-fetch";

const DEFAULT_TEXT = "";
const MAX_RESULTS = 50;

function ActionCopyBibTeX({ bib_url }: { bib_url: string }) {
  const cancelRef = useRef<AbortController | null>(null);
  console.log(`[DEBUG]${bib_url}`)

  const copyBibTex = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching BibTeX from DBLP",
    });

    try {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      // Get BibTeX from doi.org
      const url = new URL(bib_url);

      const response = await fetch(url.toString(), {
        method: "get",
        headers: {
          Accept: "application/x-bibtex",
        },
        signal: cancelRef.current.signal,
      });

      const bibTeX = await response.text();

      if (!response.ok || bibTeX === undefined) {
        throw new Error("BibTeX was not found");
      }

      // Copy the response to the clipboard
      await showHUD("Copied to Clipboard");
      await Clipboard.copy(bibTeX);
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to fetch BibTeX";
      toast.message = String(error);
    }
  }, [cancelRef]);

  return (
    <Action
      title="Copy BibTeX"
      icon={Icon.Clipboard}
      onAction={copyBibTex}
      shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  // const [url, setUrl] = useState<string | null>(null);

  // Load data from arXiv API
  let root_urls = [
    "https://dblp.org/search/publ/api?",
    "https://dblp.uni-trier.de/search/publ/api?",
    "https://dblp2.uni-trier.de/search/publ/api?",
    // "https://dblp.dagstuhl.de/search/publ/api?",
  ];

  let urls = root_urls.map((root_url) => root_url + constructSearchQuery(searchText || DEFAULT_TEXT, MAX_RESULTS));

  // useEffect(() => {
  //   console.log("waiting...")
  //   const timeOutId = setTimeout(() => setUrl("https://dblp.org/search/publ/api?" + constructSearchQuery(searchText || DEFAULT_TEXT, MAX_RESULTS)), 500);
  //   return () => clearTimeout(timeOutId);
  // }, [searchText]);

  console.debug("urls: " + urls);

  // const fastestFetch = Promise.race(urls.map((url) => useFetch(url)));

  // let data = null;
  // let isLoading = false;
  // fastestFetch.then((data_, isLoading_) => {data = data_; isLoading = isLoading_;})

  const { data, isLoading } = useFetch(urls[2], {
    parseResponse: parseResponse,
    execute: searchText.length > 0,
    // keepPreviousData: false
  });

  // Sort and filter data based on search text and category
  data;
  const filteredData = data
    ?.sort(compareSearchResults(searchText || DEFAULT_TEXT))
    ?.filter(({ access: entryAccess }) => entryAccess != "invalid");

  const title = isLoading ? "Loading..." : searchText.length ? "No Results" : "Use the search bar above to get started";

  // console.log(filteredData?.map((searchResult: SearchResult) => constructSearchListItem(searchResult)))

  // console.log(filteredData?.length);
  // console.log(filteredData?.map((searchResult: SearchResult) => constructSearchListItem(searchResult)));

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search DBLP papers by title, author etc."
      throttle={true}
    >
      <List.EmptyView icon={{ source: "../assets/dblp-logo.png" }} title={title} />
      {
        <List.Section title="Results" subtitle={filteredData?.length + ""}>
          {filteredData?.map((searchResult: SearchResult) => constructSearchListItem(searchResult))}
        </List.Section>
      }
    </List>
  );
}

function SearchListItem({ id, url, bib_url, doi_url, title, authors, venue, year, access }: SearchListItemProps) {
  const multipleAuthors = authors.length > 1;
  const addToAuthor = multipleAuthors ? " et al." : "";
  const primaryAuthor = authors[0] + addToAuthor;

  const accessories = [{ tag: { value: venue, color: Color.Blue } }, { tag: { value: year, color: Color.Green } }];
  console.log(doi_url);
  // replace doi.org to doi.org.remotexs.ntu.edu.sg
  if (doi_url) {
    doi_url = doi_url.replace("doi.org", "doi.org.remotexs.ntu.edu.sg");
  }
  // console.log(doi_url);

  return (
    <List.Item
      id={id}
      icon={{ source: Icon.Circle }}
      title={{ value: title }}
      subtitle={primaryAuthor}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open DBLP" url={url} icon={{ source: Icon.Link }} />
          <Action.OpenInBrowser title="Open DOI" url={doi_url} icon={{ source: Icon.Link }} />
          {/* <Action.CopyToClipboard
          title="Copy BibTex"
          content={bib_url}
          icon={{ source: Icon.Redo }}
          shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
        /> */}
          <ActionCopyBibTeX bib_url={bib_url} />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}

function constructSearchQuery(text: string, maxResults: number) {
  // return new URLSearchParams({
  //   search_query: text,
  //   sortBy: "relevance",
  //   sortOrder: "descending",
  //   max_results: maxResults.toString(),
  // });
  return new URLSearchParams({
    q: text,
    h: MAX_RESULTS.toString(),
  });
}

function compareSearchResults(textToCompare: string) {
  return (a: SearchResult, b: SearchResult) => {
    const aTitle = a.title ? a.title : "";
    const bTitle = b.title ? b.title : "";

    const aTitleSimilarity = natural.DiceCoefficient(aTitle, textToCompare);
    const bTitleSimiarlity = natural.DiceCoefficient(bTitle, textToCompare);

    return bTitleSimiarlity - aTitleSimilarity;
  };
}

function constructSearchListItem(searchResult: SearchResult) {
  return (
    <SearchListItem
      key={searchResult.id ? searchResult.id : ""}
      id={searchResult.id ? searchResult.id : ""}
      citekey={searchResult.citekey ? searchResult.citekey : ""}
      url={searchResult.url ? searchResult.url : ""}
      doi_url={searchResult.doi_url ? searchResult.doi_url : ""}
      bib_url={"https://dblp2.uni-trier.de/rec/" + searchResult.citekey + ".bib"}
      title={searchResult.title ? searchResult.title : ""}
      authors={searchResult.authors ? searchResult.authors : []}
      venue={searchResult.venue ? searchResult.venue : ""}
      year={searchResult.year ? searchResult.year : ""}
      access={searchResult.access ? searchResult.access : ""}
    />
  );
}
