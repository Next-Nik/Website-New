import { useEffect, useRef } from "react";
import styles from "./ContributeModal.module.css";

export default function ContributeModal({ isOpen, onClose, domainName }) {
  const overlayRef = useRef(null);
  const emailRef = useRef(null);

  useEffect(() => {
    if (isOpen && emailRef.current) {
      setTimeout(() => emailRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const email = emailRef.current?.value;
    if (email) {
      window.location.href = `mailto:hello@nextus.world?subject=Contribute to ${domainName}&body=I would like to contribute to the ${domainName} domain. My email is: ${email}`;
    }
  }

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${isOpen ? styles.open : ""}`}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="Contribute to this vision"
    >
      <div className={`${styles.modal} ${isOpen ? styles.modalOpen : ""}`}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>

        <p className={styles.eyebrow}>NEXTUS · CONTRIBUTION</p>

        <h2 className={styles.title}>
          Contribute to<br />
          <em>{domainName}</em>
        </h2>

        <div className={styles.divider} />

        <p className={styles.body}>
          Horizon goals are crowd-sourced through earned access — contributed by people with demonstrated literacy and contribution in this domain and at this scale.
        </p>
        <p className={styles.body}>
          This infrastructure is being built. Express your interest and we will be in touch when your domain opens for contribution.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="contribute-email">
            Your email
          </label>
          <div className={styles.inputRow}>
            <input
              ref={emailRef}
              id="contribute-email"
              type="email"
              className={styles.input}
              placeholder="you@domain.com"
              required
            />
            <button type="submit" className={styles.submitBtn}>
              Express interest &#8594;
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
