import './auth-notes.css'
import { useI18n } from '#/shared/i18n'

/** Decoration for the auth pages: three sample day notes. Not user data. */
export function AuthNotes() {
  const { t } = useI18n()

  return (
    <div aria-hidden="true" className="auth-notes">
      <div className="auth-notes-stage">
        <div className="auth-note auth-note-today">
          <div className="auth-note-head">
            <span className="auth-note-date">{t('auth.noteThursday')}</span>
            <span className="auth-note-when">{t('auth.noteToday')}</span>
          </div>
          <div className="auth-note-meal">
            <span className="auth-note-slot">{t('auth.noteTonight')}</span>
            <span className="auth-note-name">{t('auth.noteCarbonara')}</span>
          </div>
          <span className="auth-note-tape" />
        </div>
        <div className="auth-note auth-note-friday">
          <div className="auth-note-head">
            <span className="auth-note-date">{t('auth.noteFriday')}</span>
          </div>
          <div className="auth-note-meal">
            <span className="auth-note-slot">{t('slots.dinner')}</span>
            <span className="auth-note-name">{t('auth.noteCurry')}</span>
          </div>
        </div>
        <div className="auth-note auth-note-saturday">
          <div className="auth-note-head">
            <span className="auth-note-date">{t('auth.noteSaturday')}</span>
          </div>
          <div className="auth-note-meal">
            <span className="auth-note-slot">{t('slots.lunch')}</span>
            <span className="auth-note-name">{t('auth.noteShakshuka')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
