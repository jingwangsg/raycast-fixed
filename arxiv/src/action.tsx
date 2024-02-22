import { useCallback, useRef } from "react";
import { ActionPanel, Action, Icon, showToast, Toast, showHUD, popToRoot, Clipboard } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { exec } from "child_process";
import fetch from "node-fetch";

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

function checkFileExists(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.access(filePath, fs.constants.F_OK, (error) => {
      resolve(!error);
    });
  });
}

async function downloadPdf(url: string, destinationPath: string): Promise<void> {
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

export function ActionDownloadAndOpen({ url, pdfDir }: { url: string; pdfDir: string }) {
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);

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

  return <Action title="Download and Open PDF" onAction={handleDownloadAndOpen} icon={Icon.Download} />;
}
