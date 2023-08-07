import xml2js from "xml2js";
import { SearchResult } from "./types";

declare module "xml2js";

export async function parseResponse(response: Response): Promise<SearchResult[]> {
  const parser = new xml2js.Parser({ explicitArray: true, mergeAttrs: true });

  // Read the body content as a string
  const xml = await response.text();
  // console.debug(xml)

  // Parse the XML string
  return parser.parseStringPromise(xml).then((result: any) => {
    // console.debug(result.result.hits[0].hit)

    if (result.result.hits[0].hit) {
      return result.result.hits[0].hit.map((hit: any) => {
        let url = "";
        let authors = "";
        let title = "";
        let venue = "";
        let year = "";
        let access = "";
        let info = hit.info[0];

        // try {
        //   console.debug(["unavailable", "withdrawn"].includes(info.access[0]));
        // }
        // catch (err) {
        //   console.debug(info)
        // }

        if (info.access && ["unavailable", "withdrawn"].includes(info.access[0])) {
          return {
            id: hit.id[0],
            citekey: "",
            url: "",
            doi_url: "",
            title: "",
            authors: [""],
            venue: "",
            year: "",
            access: "invalid"
          };
        }

        // Check url is not undefined
        if (hit.url) {
          url = info.url[0];
        }

        // try {
        //   if (info.authors) {
        //     console.debug(info.authors[0].author);
        //   }
        // }
        // catch (error) {
        //   console.debug("undefined");
        //   console.debug(info);
        // }

        if (info.authors) {
          authors = info.authors[0].author.map((author: any) => author._);
        }

        // Check title is not undefined
        if (info.title) {
          title = info.title[0];
        }

        // Check venue is not undefined
        if (info.venue) {
          venue = info.venue[0];
        }

        // Check year is not undefined
        if (info.year) {
          year = info.year[0];
        }

        // Check access is not undefined
        if (info.access) {
          access = info.access[0];
        }

        return {
          id: hit.id[0],
          citekey: info.key[0],
          url: url,
          doi_url: info.ee[0],
          title: title,
          authors: authors,
          venue: venue,
          year: year,
          access: access
        };
      });
    } else {
      return [];
    }
  });

}
