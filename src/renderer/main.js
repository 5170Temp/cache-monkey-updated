import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';
import eventBus from './event-bus';
import { shell } from 'electron';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faEnvelope, faMagic, faHeart, faCog, faTrash, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { faTwitter, faLinkedinIn, faTwitch } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import VueTippy from 'vue-tippy';
import 'tippy.js/dist/tippy.css';

library.add(faTwitter, faLinkedinIn, faTwitch, faEnvelope, faMagic, faHeart, faCog, faFolderOpen, faTrash);

const app = createApp(App);
app.component('icon', FontAwesomeIcon);
app.use(router);
app.use(store);
app.use(VueTippy);
app.config.globalProperties.$electron = { shell };
app.config.globalProperties.$bus = eventBus;
app.directive('shortkey', {
  mounted(element, binding) {
    const keys = binding.value || [];
    const handler = event => {
      const key = event.key.toLowerCase();
      if (keys.some(shortcut => shortcut === key || (shortcut === 'esc' && key === 'escape'))) {
        element.dispatchEvent(new Event('shortkey'));
      }
    };
    element.__shortkeyHandler = handler;
    window.addEventListener('keydown', handler);
  },

  unmounted(element) {
    window.removeEventListener('keydown', element.__shortkeyHandler);
  }
});
app.mount('#app');
