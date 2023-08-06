import { Color } from "@raycast/api";
import { off } from "process";

export interface SearchResult {
  id: string;
  citekey: string;
  url: string;
  doi_url: string;
  title: string;
  authors: string[];
  venue: string;
  year: string;
  access: string;
}

export interface SearchListItemProps {
  id: string;
  citekey: string;
  url: string;
  bib_url: string;
  doi_url: string;
  title: string;
  authors: string[];
  venue: string;
  year: string;
  access: string;
}
