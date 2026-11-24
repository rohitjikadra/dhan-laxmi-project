import { execFileSync, execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const outZip = join(root, "dhanlaxmi-business-hub-extension.zip");

execSync("node ./scripts/build.mjs", { cwd: root, stdio: "inherit" });

if (!existsSync(join(dist, "manifest.json"))) {
  throw new Error("dist/manifest.json missing after build");
}

rmSync(outZip, { force: true });

if (process.platform === "win32") {
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${dist}\\*' -DestinationPath '${outZip}' -Force`,
    ],
    { stdio: "inherit" }
  );
} else {
  execFileSync("zip", ["-r", outZip, "."], { cwd: dist, stdio: "inherit" });
}

console.log(`[dlbh/extension] zip → ${outZip}`);
