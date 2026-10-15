import { createStore } from "vuex";

import modules from "./modules";

const persisted = (() => {
  try {
    const state = JSON.parse(localStorage.getItem('vuex') || '{}');
    delete state.updateReady;
    return state;
  }
  catch { return {}; }
})();

const store = createStore({
  strict: false,
  modules,
  state: {
    processing: false,
    fileIndex: {},
    scan: [],
    drives: [],
    dumpDirectory: "",
    watchDirectories: [],
    foundFiletypes: [],
    showPanel: true,
    viewingItem: false,
    picsDir: "",
    showModel: false,
    showConfirmModel: false,
    // task tracking
    currentTask: "Ready.",
    totalAnalysing: 0,
    totalAnalysed: 0,
    dumpScanComplete: false,
    dirScanComplete: false,
    watchBlocker: true,
    autoStart: false,
    // tooltips
    tooltipDefault: {
      placement: "top",
      arrow: true,
      animation: "fade",
      delay: [0, 0],
      duration: 0
    },
    tooltipBottom: {
      placement: "bottom",
      arrow: true,
      animation: "fade",
      delay: [0, 0],
      duration: 0
    },
    tooltipSidebar: {
      placement: "right",
      arrow: true,
      animation: "fade",
      delay: [0, 0],
      duration: 0
    },
    tooltipLeft: {
      placement: "left",
      arrow: true,
      animation: "fade",
      delay: [0, 0],
      duration: 0
    }
  },
  plugins: [store => {
    Object.assign(store.state, persisted);
    localStorage.setItem('vuex', JSON.stringify(store.state));
    store.watch(
      state => state,
      state => localStorage.setItem('vuex', JSON.stringify(state)),
      { deep: true }
    );
  }]
});

export default store;
