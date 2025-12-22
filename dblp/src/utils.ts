import xml2js from "xml2js";
import { SearchResult } from "./types";

declare module "xml2js";

const INVALID_ACCESS = new Set(["unavailable", "withdrawn"]);

export async function parseResponse(response: Response): Promise<SearchResult[]> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json") || text.trimStart().startsWith("{");

  if (isJson) {
    return parseJsonResponse(text);
  }

  return parseXmlResponse(text);
}

function parseJsonResponse(jsonText: string): SearchResult[] {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse DBLP JSON response: ${String(error)}`);
  }

  const hits = parsed?.result?.hits?.hit;
  if (!hits) {
    return [];
  }

  const hitArray = Array.isArray(hits) ? hits : [hits];
  return hitArray.map((hit: any) => mapJsonHit(hit));
}

async function parseXmlResponse(xmlText: string): Promise<SearchResult[]> {
  const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: true });
  const result = await parser.parseStringPromise(xmlText);
  const hits = result?.result?.hits?.[0]?.hit;

  if (!hits) {
    return [];
  }

  return hits.map((hit: any) => mapXmlHit(hit));
}

function mapJsonHit(hit: any): SearchResult {
  const info = hit?.info ?? {};
  const access = valueToString(info.access);

  if (access && INVALID_ACCESS.has(access)) {
    return invalidSearchResult(hit?.["@id"] ?? hit?.id);
  }

  return {
    id: valueToString(hit?.["@id"] ?? hit?.id),
    citekey: valueToString(info.key),
    url: valueToString(info.url ?? hit?.url),
    doi_url: extractDoiUrl(info),
    title: valueToString(info.title),
    authors: extractAuthors(info.authors),
    venue: valueToString(info.venue),
    year: valueToString(info.year),
    access: access
  };
}

function mapXmlHit(hit: any): SearchResult {
  const info = hit?.info?.[0] ?? {};
  const access = valueToString(info.access);

  if (access && INVALID_ACCESS.has(access)) {
    return invalidSearchResult(hit?.id?.[0]);
  }

  return {
    id: valueToString(hit?.id),
    citekey: valueToString(info.key),
    url: valueToString(info.url ?? hit?.url),
    doi_url: extractDoiUrl(info),
    title: valueToString(info.title),
    authors: extractAuthors(info.authors?.[0]),
    venue: valueToString(info.venue),
    year: valueToString(info.year),
    access: access
  };
}

function extractAuthors(authorsNode: any): string[] {
  if (!authorsNode) {
    return [];
  }

  const authorList = authorsNode.author ?? authorsNode;
  const list = Array.isArray(authorList) ? authorList : [authorList];

  return list
    .map((author) => valueToString(author))
    .filter((author): author is string => Boolean(author));
}

function extractDoiUrl(info: any): string {
  const eeUrl = valueToString(info?.ee);
  if (eeUrl) {
    return eeUrl;
  }

  const doiValue = valueToString(info?.doi);
  if (!doiValue) {
    return "";
  }

  if (doiValue.startsWith("http://") || doiValue.startsWith("https://")) {
    return doiValue;
  }

  return `https://doi.org/${doiValue}`;
}

function valueToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return valueToString(value[0]);
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.text !== undefined) {
      return valueToString(record.text);
    }
    if (record["@text"] !== undefined) {
      return valueToString(record["@text"]);
    }
    if (record._ !== undefined) {
      return valueToString(record._);
    }
  }

  return "";
}

function invalidSearchResult(idValue: unknown): SearchResult {
  return {
    id: valueToString(idValue),
    citekey: "",
    url: "",
    doi_url: "",
    title: "",
    authors: [],
    venue: "",
    year: "",
    access: "invalid"
  };
}
