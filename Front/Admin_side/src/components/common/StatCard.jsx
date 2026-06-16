import { motion } from "framer-motion";

function StatCard({ pageKey, title, value, icon: Icon }) {
  return (
    <motion.div
      className={`${pageKey}-stat-card`}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      whileHover={{ y: -3 }}
    >
      <div className={`${pageKey}-stat-card-body`}>
        <span className={`${pageKey}-stat-card-label`}>{title}</span>
        <strong className={`${pageKey}-stat-card-value`}>{value}</strong>
      </div>
      {Icon ? (
        <span className={`${pageKey}-stat-card-icon-wrap`} aria-hidden>
          <Icon className={`${pageKey}-stat-card-icon`} size={22} strokeWidth={1.75} />
        </span>
      ) : null}
    </motion.div>
  );
}

export default StatCard;
