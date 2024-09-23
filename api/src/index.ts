import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { Document } from "langchain/document";
import { writeFile, unlink } from "fs/promises";
import config from "config";
import { PDFLoader } from "langchain/document_loaders/fs/pdf"; // Use PDFLoader instead

const unstack_api_key = config.get("unstack_api_key") as string;

async function loadPdfFromUrl(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });
  return response.data;
}

async function deletePages(
  pdfBuffer: Buffer,
  pagesToDelete: number[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  let numToOffset = 1;
  for (const pageNum of pagesToDelete) {
    pdfDoc.removePage(pageNum - numToOffset);
    numToOffset++;
  }
  return Buffer.from(await pdfDoc.save());
}

async function convertPdfToDocument(
  pdfBuffer: Buffer
): Promise<Array<Document>> {
  if (unstack_api_key === undefined) {
    throw new Error("No API key set");
  }

  const randomName = Math.random().toString(36).substring(7);
  const filePath = `pdf/${randomName}.pdf`;

  await writeFile(filePath, pdfBuffer, "binary");
  console.log("Wrote PDF to disk");

  const loader = new PDFLoader(filePath); // Use PDFLoader for single file
  console.log("Loading document");

  const document = await loader.load();

  await unlink(filePath); // Clean up by removing the file
  return document;
}

async function main({
  paperUrl,
  name,
  pagesToDelete,
}: {
  paperUrl: string;
  name: string;
  pagesToDelete?: number[];
}) {
  if (!paperUrl.endsWith(".pdf")) {
    throw new Error("Invalid URL");
  }

  let pdfAsBuffer = await loadPdfFromUrl(paperUrl);

  if (pagesToDelete && pagesToDelete.length > 0) {
    // Delete pages
    pdfAsBuffer = await deletePages(pdfAsBuffer, pagesToDelete);
  }

  const document = await convertPdfToDocument(pdfAsBuffer);

  console.log(document);

  console.log("Loaded document with", document.length, "pages");
}

main({
  paperUrl: "http://localhost:3000/2305.15334v1.pdf",
  name: "test",
  // pagesToDelete: [1],
});
