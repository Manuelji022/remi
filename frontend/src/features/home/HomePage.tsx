import { Button, Icon, TextLink } from '#/components/primitives'
import type { IconName } from '#/components/primitives'
import { useI18n } from '#/shared/i18n'
import './home.css'

const features = [
  { key: 'schedule', icon: 'week' },
  { key: 'recipes', icon: 'recipes' },
  { key: 'shopping', icon: 'shopping-list' },
] as const satisfies readonly { key: string; icon: IconName }[]

export function HomePage() {
  const { t } = useI18n()

  return (
    <main className="home-page" id="main">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-intro">
          <p className="home-eyebrow">{t('home.kicker')}</p>
          <h1 id="home-title">{t('home.title')}</h1>
          <p className="home-description">{t('home.copy')}</p>
          <div className="home-actions">
            <Button
              variant="brand"
              to="/weekly-menu-planner"
              trailingIcon="next"
            >
              {t('home.start')}
            </Button>
            <TextLink to="/signup">{t('auth.createAccount')}</TextLink>
          </div>
          <p className="home-note">{t('home.note')}</p>
        </div>

        <aside className="home-preview" aria-labelledby="home-preview-title">
          <div className="home-preview-heading">
            <span className="home-icon">
              <Icon name="week" />
            </span>
            <span className="home-example-label">{t('home.example')}</span>
          </div>
          <div className="home-preview-intro">
            <h2 id="home-preview-title">{t('nav.weeklyMenu')}</h2>
            <p>{t('home.previewCopy')}</p>
          </div>
          <div className="home-preview-day">
            <h3>{t('days.Monday')}</h3>
            <dl className="home-meals">
              <div>
                <dt>{t('slots.lunch')}</dt>
                <dd>{t('home.exampleLunch')}</dd>
              </div>
              <div>
                <dt>{t('slots.dinner')}</dt>
                <dd>{t('home.exampleDinner')}</dd>
              </div>
            </dl>
          </div>
          <p className="home-preview-footer">
            <Icon name="vegetarian" size="sm" />
            {t('home.previewFooter')}
          </p>
        </aside>
      </section>

      <section className="home-features" aria-labelledby="home-features-title">
        <div className="home-section-heading">
          <h2 id="home-features-title">{t('home.featuresTitle')}</h2>
          <p>{t('home.featuresCopy')}</p>
        </div>
        <div className="home-feature-grid">
          {features.map(({ key, icon }) => (
            <article className="home-feature" key={key}>
              <span className="home-icon">
                <Icon name={icon} />
              </span>
              <h3>{t(`home.${key}Title`)}</h3>
              <p>{t(`home.${key}Copy`)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
