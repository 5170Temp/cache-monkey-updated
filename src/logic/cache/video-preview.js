const fs = require("fs");
const { spawn } = require("child_process");

function ffmpegPath() {
  let binary;
  try {
    binary = require("@ffmpeg-installer/ffmpeg").path;
  } catch (error) {
    return "ffmpeg";
  }
  const unpacked = binary.replace("app.asar", "app.asar.unpacked");
  return fs.existsSync(unpacked) ? unpacked : binary;
}

function run(binary, args, acceptProbeFailure, canceled) {
  return new Promise((resolve, reject) => {
    const process = spawn(binary, args, { windowsHide: true });
    let details = "";
    const timer = setInterval(() => {
      if (canceled()) process.kill();
    }, 250);
    const stopTimer = () => clearInterval(timer);
    process.stderr.on("data", chunk => {
      details += chunk.toString();
      if (details.length > 65536) details = details.slice(-65536);
    });
    process.on("error", error => {
      stopTimer();
      reject(error);
    });
    process.on("close", code => {
      stopTimer();
      if (canceled()) return reject(new Error("Preview canceled"));
      if (code === 0 || (acceptProbeFailure && details.includes("Input #"))) resolve(details);
      else reject(new Error(details || `FFmpeg exited with code ${code}`));
    });
  });
}

async function createPreview(input, output, canceled = () => false) {
  const binary = ffmpegPath();
  const info = await run(binary, ["-hide_banner", "-i", input], true, canceled);
  if (canceled()) throw new Error("Preview canceled");
  const hdr = /bt2020|smpte2084|arib-std-b67/i.test(info);
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", input,
    "-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-preset", "veryfast",
    "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart"];
  if (hdr) {
    args.push("-vf", "zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=hable:desat=0,zscale=p=bt709:m=bt709:t=bt709:r=tv,format=yuv420p",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709");
  }
  args.push(output);
  await run(binary, args, false, canceled);
  return output;
}

module.exports = { createPreview };
