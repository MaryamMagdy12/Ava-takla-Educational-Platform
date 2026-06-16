import { useState } from "react";
import "./LearnerAvatar.css";

function initialsFromName(name) {
  if (!name || typeof name !== "string") return "؟";
  const t = name.trim();
  if (!t) return "؟";
  if (t.length <= 2) return t;
  if (/[\u0600-\u06FF]/.test(t)) return t.slice(0, 2);
  const parts = t.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

export default function LearnerAvatar({ photoUrl, name, className = "", title }) {
  const [broken, setBroken] = useState(false);
  const initials = initialsFromName(name);
  const label = title ?? name ?? "";

  if (photoUrl && !broken) {
    return (
      <span className={`adm-learner-avatar adm-learner-avatar--photo ${className}`.trim()} title={label}>
        <img src={photoUrl} alt="" onError={() => setBroken(true)} />
      </span>
    );
  }

  return (
    <span className={`adm-learner-avatar adm-learner-avatar--initials ${className}`.trim()} title={label} aria-hidden>
      {initials}
    </span>
  );
}
