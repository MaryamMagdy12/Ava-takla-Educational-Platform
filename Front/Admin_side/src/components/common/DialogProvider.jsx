import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import "../../assets/css/Dialog.css";
import { copyToClipboard } from "../../utils/copyToClipboard";

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [copied, setCopied] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    setCopied(false);
    setPasswordValue("");
    setPasswordError("");
  }, [dialog?.title, dialog?.message, dialog?.kind]);

  const closeDialog = useCallback((value) => {
    setDialog((current) => {
      current?.resolve?.(value);
      return null;
    });
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        kind: "confirm",
        title: options.title || "تأكيد الإجراء",
        message: options.message || "",
        confirmText: options.confirmText || "تأكيد",
        cancelText: options.cancelText || "إلغاء",
        resolve,
      });
    });
  }, []);

  const confirmWithPassword = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        kind: "confirm-password",
        title: options.title || "تأكيد الإجراء",
        message: options.message || "أدخل كلمة مرور المشرف للمتابعة.",
        confirmText: options.confirmText || "تأكيد",
        cancelText: options.cancelText || "إلغاء",
        passwordLabel: options.passwordLabel || "كلمة مرور المشرف",
        resolve,
      });
    });
  }, []);

  const alertMessage = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        kind: "alert",
        title: options.title || "تنبيه",
        message: options.message || "",
        confirmText: options.confirmText || "حسنًا",
        copyText: options.copyText || "",
        resolve,
      });
    });
  }, []);

  const handlePasswordConfirm = useCallback(() => {
    const trimmed = passwordValue.trim();
    if (!trimmed) {
      setPasswordError("أدخل كلمة مرور المشرف.");
      return;
    }
    closeDialog({ confirmed: true, password: trimmed });
  }, [closeDialog, passwordValue]);

  const value = useMemo(
    () => ({ confirm, confirmWithPassword, alertMessage }),
    [confirm, confirmWithPassword, alertMessage],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="dlg-overlay" onClick={() => closeDialog(false)}>
          <div className="dlg-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="dlg-title">{dialog.title}</h3>
            <p className="dlg-message">{dialog.message}</p>
            {dialog.kind === "confirm-password" ? (
              <div className="dlg-password-field">
                <label className="dlg-password-label" htmlFor="dlg-admin-password">
                  {dialog.passwordLabel}
                </label>
                <input
                  id="dlg-admin-password"
                  className="dlg-password-input"
                  type="password"
                  autoComplete="current-password"
                  value={passwordValue}
                  onChange={(e) => {
                    setPasswordValue(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlePasswordConfirm();
                    }
                  }}
                />
                {passwordError ? <p className="dlg-password-error">{passwordError}</p> : null}
              </div>
            ) : null}
            <div className="dlg-actions">
              {dialog.kind === "confirm" || dialog.kind === "confirm-password" ? (
                <button type="button" className="dlg-btn dlg-btn--ghost" onClick={() => closeDialog(false)}>
                  {dialog.cancelText}
                </button>
              ) : null}
              {dialog.kind === "alert" && dialog.copyText ? (
                <button
                  type="button"
                  className="dlg-btn dlg-btn--ghost"
                  onClick={async () => {
                    try {
                      await copyToClipboard(dialog.copyText);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  {copied ? "تم النسخ" : "نسخ"}
                </button>
              ) : null}
              <button
                type="button"
                className="dlg-btn"
                onClick={() => {
                  if (dialog.kind === "confirm-password") {
                    handlePasswordConfirm();
                    return;
                  }
                  closeDialog(true);
                }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
