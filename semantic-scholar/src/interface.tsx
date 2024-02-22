export interface SearchState {
  results: Paper[];
  searchUrl: string;
  isLoading: boolean;
}

export interface Author {
  name: string;
}

export interface Paper {
  id: string;
  title: string;
  abstract?: string;
  authors?: Author[];
  url: string;
  venue: string;
  year: number;
  publicationDate: string;
  referenceCount: number;
  citationCount: number;
  DOI: string | undefined;
  tldr?: string;
  arxiv?: string;
  dblp?: string;
  markdown?: string;
  top_citation_url?: string;
}

export interface Preference {
  pdfDir: string;
}
