import { createRouter, createWebHashHistory } from 'vue-router'
import ScheduleView from '../views/ScheduleView.vue'
import HistoryView from '../views/HistoryView.vue'
import AdminView from '../views/AdminView.vue'

const routes = [
  { path: '/', name: 'schedule', component: ScheduleView },
  { path: '/history', name: 'history', component: HistoryView },
  { path: '/admin', name: 'admin', component: AdminView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
