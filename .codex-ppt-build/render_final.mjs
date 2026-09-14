import fs from "node:fs/promises";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const deckPath = "C:\\code_workspace\\CAPD\\outputs\\CAPD_Care_발표자료.pptx";
const outDir = "C:\\code_workspace\\CAPD\\.codex-ppt-build\\final-render";
await fs.mkdir(outDir, { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(deckPath));
for (let i = 0; i < deck.slides.items.length; i++) {
  const png = await deck.export({ slide: deck.slides.items[i], format: "png", scale: 1 });
  await fs.writeFile(`${outDir}\\slide-${i + 1}.png`, new Uint8Array(await png.arrayBuffer()));
}
const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(`${outDir}\\montage.webp`, new Uint8Array(await montage.arrayBuffer()));
console.log(`Rendered ${deck.slides.items.length} final slides`);
