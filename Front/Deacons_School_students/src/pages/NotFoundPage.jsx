import { Link } from 'react-router-dom'
import '../assets/css/NotFoundPage.css'

export default function NotFoundPage() {
  return (
    <section id="pg-notfound-root">
      <div className="pg-notfound__card">
        <h1 className="pg-notfound__title">404 - الصفحة غير موجودة</h1>
        <p className="pg-notfound__hint">الصفحة التي أدخلتها غير موجودة.</p>
        <Link to="/" className="pg-notfound__link">
          الانتقال إلى الرئيسية
        </Link>
      </div>
    </section>
  )
}
