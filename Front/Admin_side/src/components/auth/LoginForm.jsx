import { useState } from "react";
import { motion } from "framer-motion";

function LoginForm({ pageKey, onLogin, loading, error }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const canLogin = login.trim() && password.length >= 1;

  return (
    <motion.form
      id={`${pageKey}-login-form`}
      className={`${pageKey}-login-card`}
      onSubmit={(e) => {
        e.preventDefault();
        if (canLogin) onLogin(login.trim(), password);
      }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <h1 className={`${pageKey}-login-title`}>تسجيل دخول المشرف</h1>
      <p className={`${pageKey}-login-lead`}>وصول آمن إلى لوحة التحكم</p>
      {error ? <p className={`${pageKey}-login-error`}>{error}</p> : null}
      <input
        className={`${pageKey}-login-input`}
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        placeholder="البريد الإلكتروني أو اسم المستخدم"
        autoComplete="username"
      />
      <input
        className={`${pageKey}-login-input`}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="كلمة المرور"
        autoComplete="current-password"
      />
      <button className={`${pageKey}-login-submit`} type="submit" disabled={!canLogin || loading}>
        {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
      </button>
    </motion.form>
  );
}

export default LoginForm;
