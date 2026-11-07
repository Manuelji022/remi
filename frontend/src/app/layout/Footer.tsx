import { useI18n } from '#/shared/i18n'
import './footer.css'

export function Footer() {
  const year = new Date().getFullYear()
  const { t } = useI18n()

  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>
          &copy; {year} {t('footer.rights')}
        </p>
      </div>
    </footer>
  )
}
