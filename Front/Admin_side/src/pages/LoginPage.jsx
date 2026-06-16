import LoginForm from "../components/auth/LoginForm";
import "../assets/css/LoginPage.css";

const PG = "pg-login";
import LOGO_SRC from"../assets/images/انبا تكلا بجودة عالية جدا.png";

function LoginPage({ onLogin, loading, error }) {
  return (
    <div id={`${PG}-viewport`} className={`${PG}-viewport`}>
      <div className={`${PG}-brand-block`}>
        <img className={`${PG}-brand-logo`} src={LOGO_SRC} alt="" width="104" height="104" />
        <h1 className={`${PG}-brand-title`}>الأنبا تكلا — الإدارة</h1>
        <p className={`${PG}-brand-tagline`}>لوحة تحكم الإدارة</p>
        {/* <p className={`${PG}-brand-description`}>
          متابعة الطلاب والمواد والامتحانات وإدارة محتوى المنصة.
        </p> */}
      </div>
      <LoginForm pageKey={PG} onLogin={onLogin} loading={loading} error={error} />
    </div>
  );
}

export default LoginPage;
