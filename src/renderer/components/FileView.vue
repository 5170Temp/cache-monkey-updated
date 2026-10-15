<template>
  <div v-if="viewing" class="file-view">
    <div class="image-view" v-if="viewing.type == 'mp4' || viewing.type == 'webm'">
      <div class="video-big">
        <video v-if="videoSource" :key="videoSource" class="player" height="440px" width="370px" playsinline loop controls @error="videoError = true">
          <source :src="videoSource" :type="videoSourceType" @error="videoError = true">
        </video>
        <div v-if="preparingVideo">Preparing video preview...</div>
        <div v-if="videoError">Preview unavailable. Use Open File to play this video in another app.</div>
      </div>
    </div>
    <div class="image-view" v-else>
      <div
        class="image-big"
        :style='{ "background-image": `url("${fileSource}")` }'
      />
    </div>
    <div class="info-area">

      <div class="flex-row">

      <button
        class="coolbtn margin-vertical"
        style="flex-grow:1;margin-right:10px;"
        @click="$bus.emit('previousItem')"
        v-shortkey="['arrowleft']" @shortkey="$bus.emit('previousItem')"
        v-tippy="$store.state.tooltipDefault"
        title="Arrow keys work too..."
      >Previous</button>
      <button
        class="coolbtn margin-vertical"
        style="flex-grow:1"
        @click="$bus.emit('nextItem')"
        v-shortkey="['arrowright']" @shortkey="$bus.emit('nextItem')"
        v-tippy="$store.state.tooltipDefault"
        title="You can use your left and right arrow keys btw"
      >Next</button>
      </div>


      <div style="opacity:0.3;">Size</div>
      <div>{{bytesToSize(viewing.size)}}</div>
      <div v-if="viewing.incomplete">Only {{bytesToSize(viewing.size)}} of {{bytesToSize(viewing.totalSize)}} is cached. This video may stop early.</div>
      <br>
      <div style="opacity:0.3;">Created</div>
      <div>{{cleanTime(viewing.created)}} ({{niceTime(viewing.created)}})</div>
      <br>
      <div style="opacity:0.3;">Origin Location</div>
      <div>{{viewing.originLocation}}</div>
      <br>
      <!-- <div style="opacity:0.3;">Dump Location</div>
      <div>{{dumpDirectory + '/' + viewing.dumpKey}}</div>-->
      <button
        v-tippy="$store.state.tooltipLeft"
        title="Show this file in the CacheMonkey dump directory."
        class="coolbtn margin-vertical"
        @click="show(viewing)"
      >Show in Dump</button>
      <button
        v-tippy="$store.state.tooltipLeft"
        title="Open file directly."
        class="coolbtn margin-vertical"
        @click="open(viewing)"
      >Open File</button>
      <div style="opacity:0.3;"></div>

      <div class="flex-row">
      <button
        v-tippy="$store.state.tooltipLeft"
        title="By default this will copy this file to your system's Pictures folder, but you can change this in the settings."
        @click="save(viewing)"
        class="coolbtn margin-vertical"
        style="flex-grow:1;margin-right:10px;"
      >{{saved ? 'Done!' :'Quick Save ( ͡° ͜ʖ ͡°)'}}</button>
      <button
        v-tippy="$store.state.tooltipLeft"
        title="Choose a directory to copy this file to."
        @click="saveAs(viewing)"
        class="coolbtn margin-vertical"
        style="flex-grow:1;"
      >{{savedAs ? 'Done!' :'Export'}}</button>
      </div>

      <button
        v-tippy="$store.state.tooltipLeft"
        title="Remove this file from both the cache and the dump directories. This is a very effective gamershot."
        @click="deleteItem(viewing)"
        class="coolbtn margin-vertical danger"
      >Big Delete</button>
      <br>
    </div>
  </div>
</template>

<script>
import * as moment from "moment";
const { dialog } = require("@electron/remote");

moment.updateLocale("en", {
  relativeTime: {
    future: "now",
    past: "%s",
    s: "1 second ago",
    m: "1 minute ago",
    mm: "%d minutes ago",
    h: "1 hour ago",
    hh: "%d hours ago",
    d: "1 day ago",
    dd: "%d days ago",
    M: "1 month ago",
    MM: "%d months ago",
    y: "1 year ago",
    yy: "%d years ago"
  }
});
import { promisify } from "util";
const fs = require("fs");
const copyFile = promisify(fs.copyFile);
const { shell } = require("electron");
const Path = require("path");
const os = require("os");
const { pathToFileURL } = require("url");
const { createPreview } = require("../../logic/cache/video-preview");
export default {
  data() {
    return {
      saved: false,
      savedAs: false,
      videoSource: "",
      videoSourceType: "video/mp4",
      preparingVideo: false,
      videoError: false,
      previewVersion: 0,
      previewFiles: [],
      previewDirectory: fs.mkdtempSync(Path.join(os.tmpdir(), "cache-monkey-preview-"))
    };
  },

  watch: {
    viewing() {
      this.saved = false;
      this.savedAs = false;
      this.prepareVideo();
    }
  },
  computed: {
    viewing() {
      return this.$store.state.viewingItem;
    },

    dumpDirectory() {
      return this.$store.state.dumpDirectory;
    },

    fileSource() {
      return this.viewing
        ? pathToFileURL(Path.join(this.dumpDirectory, this.viewing.dumpKey)).href
        : "";
    },

    picsDir: {
      get() {
        return this.$store.state.picsDir;
      },

      set(value) {
        this.$store.state.picsDir = value;
      }
    },
    fileIndex: {
      get() {
        return this.$store.state.fileIndex;
      },

      set(value) {
        this.$store.state.fileIndex = value;
      }
    }
  },

  mounted() {
    this.prepareVideo();
  },

  beforeUnmount() {
    this.previewVersion += 1;
    this.videoSource = "";
    this.previewFiles.forEach(file => {
      try { fs.unlinkSync(file); } catch (error) {}
    });
  },

  methods: {
    async prepareVideo() {
      const version = ++this.previewVersion;
      this.videoSource = "";
      this.videoError = false;
      this.previewFiles.forEach(file => {
        try { fs.unlinkSync(file); } catch (error) {}
      });
      this.previewFiles = [];
      if (!this.viewing || !["mp4", "webm"].includes(this.viewing.type)) return;
      const input = Path.join(this.dumpDirectory, this.viewing.dumpKey);
      const fallback = pathToFileURL(input).href;
      const output = Path.join(this.previewDirectory, `${version}.mp4`);
      this.preparingVideo = true;
      try {
        await createPreview(input, output, () => version !== this.previewVersion);
        if (version === this.previewVersion) {
          this.videoSource = pathToFileURL(output).href;
          this.videoSourceType = "video/mp4";
          this.previewFiles.push(output);
        }
      } catch (error) {
        try {
          if (fs.existsSync(output)) fs.unlinkSync(output);
        } catch (cleanupError) {}
        if (version === this.previewVersion) console.error("Could not prepare video preview", error);
        if (version === this.previewVersion) {
          this.videoSource = fallback;
          this.videoSourceType = `video/${this.viewing.type}`;
        }
      } finally {
        if (version === this.previewVersion) this.preparingVideo = false;
      }
    },

    cleanTime(time) {
      return moment(time)
        .format("LL")
        .toLocaleString();
    },

    async open(file) {
      const error = await shell.openPath(Path.join(this.dumpDirectory, file.dumpKey));
      if (error) this.$bus.emit("alert", "error", `Could not open file: ${error}`);
    },

    show(file) {
      shell.showItemInFolder(this.dumpDirectory + "/" + file.dumpKey);
    },

    async save(file) {
      console.log(
        this.dumpDirectory + "/" + file.dumpKey,
        this.picsDir + "/" + file.dumpKey
      );
      await copyFile(
        this.dumpDirectory + "/" + file.dumpKey,
        this.picsDir + "/" + file.dumpKey
      );
      this.saved = true;
    },

    async saveAs(file) {
      let dir = dialog.showOpenDialogSync({
        properties: ["openDirectory"]
      });
      if (dir && dir.length > 0) {
        await copyFile(
          this.dumpDirectory + "/" + file.dumpKey,
          Path.join(dir[0], file.dumpKey)
        );
        this.savedAs = true;
      }
    },

    async deleteItem(file) {
      let key = this.dumpDirectory + "/" + file.dumpKey;
      // console.log(key);
      // console.log(file.originLocation);
      if (fs.existsSync(key)) await fs.unlinkSync(key);
      const origins = file.originLocations || [file.originLocation];
      for (const origin of origins) {
        if (origin && fs.existsSync(origin)) fs.unlinkSync(origin);
      }

      console.log(file.dumpKey.split(".")[0]);

      delete this.fileIndex[file.dumpKey.split(".")[0]];

      this.$bus.emit("closeModal");

      this.fileIndex = Object.assign({}, this.fileIndex);
    },

    bytesToSize(bytes) {
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      if (bytes === 0) return "0 Byte";
      const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
      return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
    },

    niceTime(time) {
      return moment(time).fromNow(false);
    }
  }
};
</script>

<style lang="scss">
.file-view {
  display: flex;
  flex-direction: row;
}
.video-big {
  left: 0;
  right: 0;
  margin: auto;
  min-height: 200px;

}
.image-big {
  height: 70vh;
  width: 500px;
  background-size: contain;
  background-position: center;
  background-color: black;
  background-repeat: no-repeat;
}
.info-area {
  margin: 20px;
  display: flex;
  flex-direction: column;
  max-width: 336px;
  /* overflow: hidden; */
}
</style>
