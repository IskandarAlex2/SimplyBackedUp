import { walk } from "@std/fs";
import * as path from "@std/path";
import * as pretty_logs from "saihex/pretty_logs";
import * as gitignore from "@cfa/gitignore-parser";

if (Deno.args.includes("--version")) {
  pretty_logs.log("SimplyBackedUp by IskandarAlex2 - v1.2")
  Deno.exit(0);
}

const abortSignal = new AbortController();

Deno.addSignalListener("SIGINT", () => {
  abortSignal.abort("^C");

  Deno.exit(130);
});

const working_dir = Deno.cwd();
pretty_logs.log(`Working dir: ${working_dir}`);

const exclusion_map: Map<string, string[]> = new Map();

for await (
  const dirEntry of walk(working_dir, {
    exts: [".backupignore"],
    includeDirs: false,
  })
) {
  const parenting_dir = path.dirname(dirEntry.path);
  const ignore_file_contents = await Deno.readTextFile(dirEntry.path);

  const ignoredfiles = gitignore.compile(ignore_file_contents);
  const ignores: string[] = [];

  for await (const dirEntry2 of walk(parenting_dir, { includeDirs: true })) {
    let localPath = dirEntry2.path.replace(`${parenting_dir}/`, "");

    if (dirEntry2.isDirectory && !localPath.endsWith("/")) {
      localPath += "/";
    }

    if (!ignoredfiles.denies(localPath)) {
      continue;
    }

    ignores.push(localPath);
  }

  exclusion_map.set(parenting_dir, ignores);
}

{
  console.log("\n");
  pretty_logs.log("We will be ignoring:");

  exclusion_map.forEach((val, key) => {
    pretty_logs.log(`> ${key}`);
    val.forEach((val2) => {
      pretty_logs.log(`>> ${val2}`);
    });
  });

  console.log("\n");
  pretty_logs.log(
    "Compressing may take a while. Ensure all programs that are writing to the files are turned off to avoid file corruption.",
  );
  const shouldProceed = confirm("Do you want to proceed?");

  if (!shouldProceed) Deno.exit(0);
}

//

pretty_logs.log("Generating tarball command...");

const tarExcludes: string[] = [];

for (const [dir, ignoredFiles] of exclusion_map) {
  for (const file of ignoredFiles) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(working_dir, fullPath);
    tarExcludes.push(relPath);
  }
}

//

const archiveName = `backup-${
  new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
}.tar.gz`;

const archiveParentDir = prompt(
  "Select a directory to save the tarball (avoid backing up into itself):",
  path.dirname(working_dir),
);
const archivePath = path.join(
  archiveParentDir ?? path.dirname(working_dir),
  archiveName,
);

pretty_logs.log(`Backup archive will be saved to: ${archivePath}`);

const tmpDir = Deno.env.get("TMPDIR") ??
               Deno.env.get("TEMP") ??
               Deno.env.get("TMP") ??
               "/tmp";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

const excludeFilePath = path.join(
  tmpDir,
  `backup-exclude-${timestamp}.list`,
);

await Deno.writeTextFile(excludeFilePath, tarExcludes.join("\n"));

const tarCommand = [
  "tar",
  Deno.args.includes("-v") ? "-czvf" : "-czf",
  archivePath,
  `--exclude-from=${excludeFilePath}`,
  ".", // archive everything from current dir
];

const cmd = new Deno.Command(tarCommand[0], {
  args: tarCommand.slice(1),
  cwd: working_dir,
  stdout: "piped",
  stderr: "piped",
  signal: abortSignal.signal,
});

pretty_logs.log("Running tarball creation...");
const process = cmd.spawn();

const stdoutReader = process.stdout.getReader();
const stderrReader = process.stderr.getReader();

const decoder = new TextDecoder();

// Stream function
async function streamOutput(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  label: string,
  warning: boolean,
) {
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    text.split("\n").forEach((line) => {
      if (line.trim()) {
        if (warning) pretty_logs.logWarning(`[${label}] ${line.trim()}`);
        else pretty_logs.log(`[${label}] ${line.trim()}`);
      }
    });
  }
}

await Promise.all([
  streamOutput(stdoutReader, "tar", false),
  streamOutput(stderrReader, "err", true),
]);

const cmdStatus = await process.status;

if (!cmdStatus.success) {
  if (cmdStatus.code == 130) {
    Deno.exit(130);
  }

  pretty_logs.logError("Tarball creation failed.");
  Deno.exit(1);
}

pretty_logs.logSuccess(`Tarball created successfully: ${archivePath}`);

try {
  const stat = await Deno.stat(archivePath);
  const sizeInMB = (stat.size / (1024 * 1024)).toFixed(2);
  pretty_logs.log(`📦 Archive size: ${sizeInMB} MB (${stat.size} bytes)`);
} catch (err) {
  pretty_logs.logWarning(`Could not determine archive size: ${err}`);
}
