import './footer.css'

import { useI18n } from '#/i18n'

export default function Footer() {
  const year = new Date().getFullYear()
  const { t } = useI18n()

  return (
    <footer className="footer">
      <p>
        &copy; {year} {t('footer.rights')}
      </p>
    </footer>
  )
}
