#!/usr/bin/env node

import fs from "fs";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers"
import child_process from "child_process";

const encoders = {
  "h264": "h264_nvenc",
  "h265": "hevc_nvenc"
}

function runFfmpeg({ moviePath, subtitlePath, outputPath, gpuDecode = false, threads, outputFormat }) {
  const command = [
    "ffmpeg",
    "-hide_banner",
    ...(threads ? [`-threads ${threads}`] : []),
    "-vsync 0",
    ...(gpuDecode ? ["-c:v h264_cuvid"] : []),
    `-i "${moviePath}"`,
    "-c:a copy",
    `-c:v ${encoders[outputFormat]}`,
    "-b:v 5.0M",
    `-vf "subtitles=${subtitlePath},hwupload_cuda"`,
    `"${outputPath}"`, 
  ].join(" ");

  console.log(command);
  child_process.execSync(command, { stdio: "inherit" })
}

function getDefaultSubPath(videoPath) {
  const videoBaseName = path.basename(videoPath, path.extname(videoPath));
  const mediaFolder = path.dirname(videoPath);

  return path.join(mediaFolder, videoBaseName + '.srt');
}

function getDefaultOutputPath(videoPath) {
  const ext = path.extname(videoPath);
  const videoBaseName = path.basename(videoPath, ext);
  const mediaFolder = path.dirname(videoPath);

  return path.join(mediaFolder, `${videoBaseName}-subs${ext}`);
}

function main() {
  const argv = yargs(hideBin(process.argv))
  .option("gpuDecode", {
    type: "boolean"
  })
  .option("outputFormat", {
    default: "h264",
    choices: ["h264", "h265"]
  })
  .option("threads", {
    alias: "t",
    type: "number"
  })
  .option("subtitles", {
    describe: "path to subtitles file",
    alias: "s"
  })
  .option("outputName", {
    describe: "output file name",
    alias: "o"
  })
  .positional("moviePath", {
    describe: "file to burn subtitles into",
    demandOption: true,
  })
  .check((argv, options) => {
    if (!argv._.length > 1) {
      throw new Error("Only can transcode 1 file at a time");
    }

    if (!argv.subtitles) {
      const srtPath = getDefaultSubPath(argv._[0]);
      if (!fs.existsSync(srtPath)) {
        throw new Error("Subtitles couldn't be found automatically, please pass --subtitles explicitly");
      }
    }

    return true;
  })
  .argv;

  runFfmpeg({
    moviePath: argv._[0],
    subtitlePath: argv.subtitles || getDefaultSubPath(argv._[0]),
    outputPath: argv.outputName || getDefaultOutputPath(argv._[0]),
    gpuDecode: argv.gpuDecode,
    threads: argv.threads,
    outputFormat: argv.outputFormat
  })
}

main();