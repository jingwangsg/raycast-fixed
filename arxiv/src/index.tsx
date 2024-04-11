import { ActionPanel, Action, List, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { URLSearchParams } from "node:url";
import { formatDistanceToNow } from "date-fns";
import natural from "natural";
import { SearchResult, ArxivCategory, ArxivCategoryColour, SearchListItemProps, Preference } from "./types";
import { parseResponse } from "./utils";
import { ActionDownloadAndOpen } from "./action";
import { expandHomeDir } from "./utils";

const DEFAULT_TEXT = "";
const MAX_RESULTS = 30;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState(ArxivCategory.All);

  const replacedSearchText = searchText.replace(/[:\-]/g, " ");
  // Load data from arXiv API
  const { data, isLoading } = useFetch(
    "http://export.arxiv.org/api/query?" + constructSearchQuery(replacedSearchText || DEFAULT_TEXT, MAX_RESULTS),
    {
      parseResponse: parseResponse,
      execute: searchText.length > 0,
    }
  );

  // replace ":" and "-" in searchText to space

  console.log(
    "http://export.arxiv.org/api/query?" + constructSearchQuery(replacedSearchText || DEFAULT_TEXT, MAX_RESULTS)
  );

  // Sort and filter data based on search text and category
  const filteredData = data
    ?.sort(compareSearchResults(searchText || DEFAULT_TEXT))
    ?.filter(
      ({ category: entryCategory }: SearchResult) =>
        category == "" || category === "phys" || entryCategory.includes(category)
    );

  const preference = getPreferenceValues<Preference>();

  const title = isLoading ? "Loading..." : searchText.length ? "No Results" : "Use the search bar above to get started";

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search arXiv papers by title, author, or abstract"
      throttle={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          defaultValue={ArxivCategory.All}
          storeValue
          onChange={(newValue) => setCategory(newValue as ArxivCategory)}
        >
          {Object.entries(ArxivCategory).map(([name, value]) => (
            <List.Dropdown.Item key={name} title={name} value={value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView icon={{ source: "../assets/1arxiv-logo.png" }} title={title} />

      <List.Section title="Results" subtitle={filteredData?.length + ""}>
        {filteredData?.map((searchResult: SearchResult) => constructSearchListItem({ searchResult, preference }))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  id,
  published,
  title,
  authors,
  category,
  first_category,
  pdf_link,
  pdf_dir,
}: SearchListItemProps) {
  const date = new Date(published);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true });
  const accessories = [{ tag: timeAgo }];

  const authorsString = authors ? authors.join(", ") : "";
  const multipleAuthors = authorsString.split(",").length > 1;
  const addToAuthor = multipleAuthors ? " et al." : "";
  const primaryAuthor = authorsString.split(",")[0] + addToAuthor;

  const categoryColour = ArxivCategoryColour[
    first_category as keyof typeof ArxivCategoryColour
  ] as unknown as Color.ColorLike;

  // const ar5iv_link = pdf_link.replace("arxiv", "ar5iv");
  const abs_link = id;
  // http://arxiv.org/abs/2110.06553 -> 2110.06553
  const arxiv_id = id.split("/").pop();
  const kimi_url = "https://papers.cool/arxiv/" + arxiv_id;

  return (
    <List.Item
      id={id}
      icon={{ source: Icon.Circle, tintColor: categoryColour }}
      title={{ value: title, tooltip: category }}
      subtitle={primaryAuthor}
      actions={
        <ActionPanel>
          {/* <Action.OpenInBrowser title="Open PDF" url={pdf_link} icon={{ source: Icon.Link }} /> */}
          <Action.OpenInBrowser title="Open Abstract" url={abs_link} icon={{ source: Icon.Link }} />
          <ActionDownloadAndOpen url={pdf_link} pdfDir={pdf_dir} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
          <Action.OpenInBrowser
            title="Open Kimi"
            url={kimi_url}
            icon={{ source: Icon.Link }}
            shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
          />
          <Action.CopyToClipboard
            title="Copy Link"
            content={pdf_link}
            icon={{ source: Icon.Redo }}
            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
          />
        </ActionPanel>
      }
      accessories={accessories}
    />
  );
}

function constructSearchQuery(text: string, maxResults: number) {
  return new URLSearchParams({
    search_query: `"${text}"`,
    sortBy: "relevance",
    sortOrder: "descending",
    max_results: maxResults.toString(),
  });
}

function compareSearchResults(textToCompare: string) {
  return (a: SearchResult, b: SearchResult) => {
    const aTitle = a.title ? a.title[0] : "";
    const bTitle = b.title ? b.title[0] : "";

    const aTitleSimilarity = natural.DiceCoefficient(aTitle, textToCompare);
    const bTitleSimiarlity = natural.DiceCoefficient(bTitle, textToCompare);

    return bTitleSimiarlity - aTitleSimilarity;
  };
}

function constructSearchListItem({ searchResult, preference }: { searchResult: SearchResult; preference: Preference }) {
  const pdfDir = expandHomeDir(preference.pdfDir);
  const _id = searchResult.id[0];
  const id = _id.slice(-2, -1) == "v" ? _id.slice(0, -2) : _id;
  const pdf_link = id.replace("abs", "pdf") + ".pdf";

  return (
    <SearchListItem
      key={id ? id : ""}
      id={id ? id : ""}
      published={searchResult.published}
      title={searchResult.title ? searchResult.title[0] : ""}
      authors={searchResult.authors}
      category={searchResult.category ? searchResult.category : ""}
      first_category={searchResult.category ? searchResult.category.split(".")[0] : ""}
      // pdf_link={searchResult.link + ".pdf" || ""}
      // prevent something like 1706.03762v7 to ruin the file naming
      pdf_link={searchResult.id ? pdf_link : ""}
      pdf_dir={pdfDir}
    />
  );
}
