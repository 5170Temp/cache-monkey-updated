import { createRouter, createWebHashHistory } from 'vue-router';
import LandingPage from '@/components/LandingPage.vue';
import Settings from '@/components/Settings.vue';
import Info from '@/components/Info.vue';

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/home', name: 'home', component: LandingPage },
    { path: '/settings', name: 'settings', component: Settings },
    { path: '/info', name: 'info', component: Info },
    { path: '/:pathMatch(.*)*', redirect: '/home' }
  ]
});
