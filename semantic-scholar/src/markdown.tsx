import { Paper } from "./types";
import { getConferenceAbbreviation } from "./constant";

function getYearString(paper: Paper) {
  let yearString = String(paper.year % 100).padStart(2, "0"); // default
  if (paper.DOI && !paper.DOI.includes("arXiv")) {
    // DOI like "10.1109/CVPR.2018.00675"
    if (
      paper.DOI.includes("iccv") ||
      paper.DOI.includes("cvpr") ||
      paper.DOI.includes("eccv")
    ) {
      yearString = paper.DOI.split("/")[1].split(".")[1].slice(2, 4);
    } else if (paper.DOI.includes("acl") || paper.DOI.includes("emnlp")) {
      yearString = paper.DOI.split("/")[1].split(".")[0].slice(2, 4);
    } else if (paper.DOI.includes("aaai")) {
      // doi like 10.1609/aaai.v33i01.33016786
      // v33 corresponds to year 2019, so calculate year accordingly
      yearString = String(
        1986 + Number(paper.DOI.split(".")[1].slice(1, 3))
      ).slice(2, 4);
    }
    // console.log(yearString);
  }
  return yearString;
}
export function getMarkdownString(paper: Paper) {
  let yearString = getYearString(paper);
  let conference_abbreviation: string = getConferenceAbbreviation(paper.venue);

  let url = paper.url;
  if (paper.arxiv) {
    url = `https://arxiv.org/pdf/${paper.arxiv}.pdf`;
  } else {
    url = `https://doi.org/${paper.DOI}`;
  }

  let markdown_string = "[" + paper.title + "](" + url + ")";
  markdown_string += " ";
  if (conference_abbreviation != "") {
    let postfix = conference_abbreviation + "'" + yearString;
    if (paper.arxiv) {
      const arxiv_date = paper.arxiv.split(".")[0];
      postfix = postfix + `/${arxiv_date}`;
    }
    markdown_string += postfix;
  } else if (paper.venue == "arXiv.org" || paper.venue == "") {
    markdown_string += "arXiv" + ":" + paper.arxiv;
  } else {
    markdown_string += paper.venue;
    markdown_string += "'" + yearString;
  }
  // console.log(paper.arxiv);
  // if (paper.arxiv) {
  //   markdown_string += ` [PDF](https://arxiv.org/pdf/${paper.arxiv}.pdf) `;
  // } else if (paper.DOI) {
  //   markdown_string += ` [Official](https://doi.org.remotexs.ntu.edu.sg/${paper.DOI}) `;
  // }
  return markdown_string;
}
