import { useState } from 'react'
import { initialsFromName } from '../utils/learnerDisplay'
import '../assets/css/LearnerAvatar.css'

export default function LearnerAvatar({ photoUrl, name, className = '', title }) {
  const [broken, setBroken] = useState(false)
  const initials = initialsFromName(name)
  const label = title ?? name ?? ''

  const rootClass = [
    'pg-learner-avatar',
    photoUrl && !broken ? 'pg-learner-avatar--photo' : 'pg-learner-avatar--initials',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (photoUrl && !broken) {
    return (
      <span className={rootClass} title={label}>
        <img src={photoUrl} alt="" onError={() => setBroken(true)} />
      </span>
    )
  }

  return (
    <span className={rootClass} title={label} aria-hidden>
      {initials}
    </span>
  )
}
