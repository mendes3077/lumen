type TextItem = { str?: string };

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const max = Math.min(doc.numPages, 40);
  const parts: string[] = [];
  for (let pageNumber = 1; pageNumber <= max; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => {
        if (item && typeof item === "object" && "str" in item) {
          return String((item as TextItem).str ?? "");
        }
        return "";
      })
      .join(" ");
    parts.push(line);
  }
  const text = parts.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new Error("Este PDF não tem texto selecionável. Cole o texto ou use um arquivo .txt.");
  if (doc.numPages > max) return `${text}\n\n[Leitura limitada às primeiras 40 páginas.]`;
  return text;
}
