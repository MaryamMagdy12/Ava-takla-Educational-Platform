import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import '../../assets/css/GacExamFamilyPanel.css'

function countLabel(exam) {
  const n = exam.questionsCount
  if (n === '—' || n == null || n === '') return '—'
  return `${n} سؤالاً`
}

export default function GacExamFamilyPanel({ exam, index }) {
  const navigate = useNavigate()
  const hasCompetition = exam.competitionId != null

  function onAction() {
    if (!hasCompetition) return
    if (exam.attempt?.status === 'submitted' && exam.attempt?.id) {
      navigate(`/competitions/result/${exam.attempt.id}`)
      return
    }
    navigate(`/competitions/session/${exam.competitionId}`, { state: { attempt: exam.attempt } })
  }

  const btnLabel = !hasCompetition
    ? 'غير متاحة ضمن نافذتك الحالية'
    : exam.attempt?.status === 'submitted'
      ? 'عرض النتيجة'
      : exam.attempt?.status === 'in_progress'
        ? 'متابعة المسابقة'
        : 'بدء المسابقة'

  return (
    <motion.div
      className="gac-exam-family-panel"
      role="group"
      aria-label={exam.title}
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.42, delay: index * 0.06 }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="gac-exam-family-panel__row">
        <span className="gac-exam-family-panel__mode">{exam.mode}</span>
        <span className="gac-exam-family-panel__count">{countLabel(exam)}</span>
      </div>
      <h2 className="gac-exam-family-panel__title">{exam.title}</h2>
      <p className="gac-exam-family-panel__course">ضمن المسار: {exam.courseTitle}</p>
      <p className="gac-exam-family-panel__window">{exam.windowLabel}</p>
      <button
        type="button"
        className="gac-exam-family-panel__btn"
        disabled={!hasCompetition}
        onClick={onAction}
      >
        {btnLabel}
      </button>
    </motion.div>
  )
}
