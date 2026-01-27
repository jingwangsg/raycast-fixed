import { useCallback, useRef } from "react";
import {
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  showHUD,
  popToRoot,
  Clipboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { exec } from "child_process";
import fetch from "node-fetch";
import { Paper } from "./types";
import { getMarkdownString } from "./markdown";

export function ActionCopyBibTeX({ bib_url }: { bib_url: string }) {
  const cancelRef = useRef<AbortController | null>(null);

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
      // shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
    />
  );
}

function readApiKeySync(filePath: string): string {
  try {
    const data = fs.readFileSync(filePath, { encoding: "utf-8" });
    return data.trim();
  } catch (err) {
    console.error("Error reading the API key:", err);
    return "";
  }
}

type RelatedKind = "citations" | "references";

type GraphPaper = {
  paperId: string;
  title?: string;
  url?: string;
  venue?: string;
  year?: number;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    DBLP?: string;
  };
};

function mapGraphPaper(paper: GraphPaper): Paper {
  return {
    id: paper.paperId,
    title: paper.title ?? "",
    abstract: "",
    authors: [],
    url: paper.url ?? "",
    venue: paper.venue ?? "",
    year: paper.year ?? 0,
    publicationDate: "",
    referenceCount: 0,
    citationCount: 0,
    DOI: paper.externalIds?.DOI,
    arxiv: paper.externalIds?.ArXiv ?? "",
    dblp: paper.externalIds?.DBLP ?? "",
  };
}

async function fetchRelatedPapers(
  paperId: string,
  kind: RelatedKind
): Promise<Paper[]> {
  const fields = "title,url,venue,year,externalIds";
  const apiKey =
    readApiKeySync(path.join(String(process.env.HOME), "api_key_ss.txt")) || "";
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-api-key"] = String(apiKey);
  }

  const collected: Paper[] = [];
  const limit = 1000;
  let offset = 0;

  while (true) {
    const params = new URLSearchParams();
    params.append("fields", fields);
    params.append("limit", String(limit));
    params.append("offset", String(offset));

    const response = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/${paperId}/${kind}?` +
        params.toString(),
      {
        method: "get",
        headers,
      }
    );

    const json = (await response.json()) as {
      data?: { citingPaper?: GraphPaper; referencedPaper?: GraphPaper }[];
      total?: number;
      offset?: number;
      next?: number;
      message?: string;
    };

    if (!response.ok || json.message) {
      throw new Error(json.message ? json.message : response.statusText);
    }

    const data = json.data ?? [];
    if (data.length === 0) {
      break;
    }

    for (const item of data) {
      const paper =
        kind === "citations" ? item.citingPaper : item.referencedPaper;
      if (paper?.paperId) {
        collected.push(mapGraphPaper(paper));
      }
    }

    if (typeof json.total === "number") {
      if (offset + data.length >= json.total) {
        break;
      }
      offset += data.length;
      continue;
    }

    if (typeof json.next === "number") {
      offset = json.next;
      continue;
    }

    if (data.length < limit) {
      break;
    }

    offset += data.length;
  }

  return collected;
}

function buildBulletList(papers: Paper[]): string {
  return papers.map((paper) => `- ${getMarkdownString(paper)}`).join("\n");
}

export function ActionCopyCitations({
  paperId,
}: {
  paperId: string;
}) {
  const copyCitations = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching citations",
    });

    try {
      const papers = await fetchRelatedPapers(paperId, "citations");
      if (papers.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "No citations found";
        return;
      }

      const content = buildBulletList(papers);
      await Clipboard.copy(content);
      await showHUD("Copied to Clipboard");
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to fetch citations";
      toast.message = String(error);
    }
  }, [paperId]);

  return (
    <Action
      title="Copy Citations to Clipboard"
      icon={Icon.Clipboard}
      onAction={copyCitations}
    />
  );
}

export function ActionCopyReferences({
  paperId,
}: {
  paperId: string;
}) {
  const copyReferences = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching references",
    });

    try {
      const papers = await fetchRelatedPapers(paperId, "references");
      if (papers.length === 0) {
        toast.style = Toast.Style.Success;
        toast.title = "No references found";
        return;
      }

      const content = buildBulletList(papers);
      await Clipboard.copy(content);
      await showHUD("Copied to Clipboard");
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Unable to fetch references";
      toast.message = String(error);
    }
  }, [paperId]);

  return (
    <Action
      title="Copy References to Clipboard"
      icon={Icon.Clipboard}
      onAction={copyReferences}
    />
  );
}

function checkFileExists(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (error) => {
      resolve(!error);
    });
  });
}

async function downloadPdf(
  url: string,
  destinationPath: string
): Promise<void> {
  const fileExists = await checkFileExists(destinationPath);
  if (fileExists) {
    console.log("File already exists. Skipping download.");
    return;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  const pdfData = await response.arrayBuffer();
  fs.writeFileSync(destinationPath, Buffer.from(pdfData));
}

function openFileWithDefaultApplication(filePath: string) {
  exec(`open "${filePath}"`, (error) => {
    if (error) {
      console.error(`Could not open the file: ${error.message}`);
      return;
    }
    console.log("File opened successfully");
  });
}

export function ActionDownloadAndOpen({
  url,
  pdfDir,
}: {
  url: string;
  pdfDir: string;
}) {
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(
    null
  );

  const handleDownloadAndOpen = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading PDF",
    });

    try {
      const pdfFilename = url.split("/").pop() || "downloaded.pdf";
      const destinationPath = path.join(pdfDir, pdfFilename);

      await downloadPdf(url, destinationPath);

      toast.style = Toast.Style.Success;
      toast.title = "PDF Downloaded Successfully";
      setDownloadedFilePath(destinationPath);

      openFileWithDefaultApplication(destinationPath);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Download PDF";
      toast.message = String(error);
      setDownloadedFilePath(null);
    }
  };

  return (
    <Action
      title="Download and Open PDF"
      onAction={handleDownloadAndOpen}
      icon={Icon.Download}
    />
  );
}
