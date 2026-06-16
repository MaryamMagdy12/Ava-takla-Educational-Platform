import { storagePublicUrl } from '../../api/config.js'
import '../../assets/css/ScLecturePlayer.css'

export default function ScLecturePlayer({ lecture }) {
  const src = storagePublicUrl(lecture?.filePath)
  const type = String(lecture?.lectureType ?? '').toLowerCase()

  if (!src) {
    return <p className="sc-lecture-player__missing">لا يوجد ملف فيديو/صوت مرفوع لهذه المحاضرة بعد.</p>
  }

  if (type === 'video') {
    return (
      <div className="sc-lecture-player">
        <video className="sc-lecture-player__video" controls playsInline preload="metadata" src={src}>
          المتصفح لا يدعم تشغيل الفيديو.
        </video>
      </div>
    )
  }

  if (type === 'audio') {
    return (
      <div className="sc-lecture-player">
        <audio className="sc-lecture-player__audio" controls preload="metadata" src={src}>
          المتصفح لا يدعم تشغيل الصوت.
        </audio>
      </div>
    )
  }

  return (
    <p className="sc-lecture-player__missing">
      <a className="sc-lecture-player__link" href={src} target="_blank" rel="noopener noreferrer">
        فتح الملف
      </a>
    </p>
  )
}
