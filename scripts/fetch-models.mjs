import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const files = [
  ["public/models/michelle.glb", "https://threejs.org/examples/models/gltf/Michelle.glb"],
  ["public/models/xbot.glb", "https://threejs.org/examples/models/gltf/Xbot.glb"],
];

for (const [dest, url] of files) {
  try {
    await access(dest);
    console.log("já existe", dest);
    continue;
  } catch {
    /* download */
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`falhou ${url}: ${res.status}`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log("baixou", dest);
}
