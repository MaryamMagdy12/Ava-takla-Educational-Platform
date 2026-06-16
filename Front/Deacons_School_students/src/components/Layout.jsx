import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import NavBar from './NavBar'
import '../assets/css/Layout.css'
const MotionMain = motion.main

export default function Layout() {
  return (
    <div id="pg-layout-shell">
      <NavBar />
      <MotionMain
        id="pg-layout-main"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Outlet />
      </MotionMain>
    </div>
  )
}
