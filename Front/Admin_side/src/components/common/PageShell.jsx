import { motion } from "framer-motion";

function PageShell({ pageKey, title, subtitle, children }) {
  return (
    <motion.section
      id={`${pageKey}-page-root`}
      className={`${pageKey}-shell adm-page-shell`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {title ? <h2 className={`${pageKey}-shell-title`}>{title}</h2> : null}
      {subtitle ? <p className={`${pageKey}-shell-subtitle`}>{subtitle}</p> : null}
      {children}
    </motion.section>
  );
}

export default PageShell;
