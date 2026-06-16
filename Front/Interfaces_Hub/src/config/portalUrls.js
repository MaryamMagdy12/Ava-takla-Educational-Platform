/**
 * عناوين التشغيل المحلي الافتراضية — تطابق منافذ Vite في كل مشروع.
 * غيّرها عبر .env: VITE_PORTAL_DEACONS, VITE_PORTAL_SPECIALIZED, VITE_PORTAL_GAC
 *
 * المنافذ: Deacons 5173 | GAC 5174 | Specialized 5175 | Interfaces Hub 5176
 */
export const PORTAL_URLS = {
    deaconsSchoolStudents: import.meta.env.VITE_PORTAL_DEACONS ?? 'http://192.168.1.7:5174/',
    specializedCourses: import.meta.env.VITE_PORTAL_SPECIALIZED ?? 'http://192.168.1.7:5175/',
  generalAssemblyCompetitions: import.meta.env.VITE_PORTAL_GAC ?? 'http://192.168.1.7:5177/',
}
