import { useState } from 'react'

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const MENU_SETS = [
  {
    Monday: {
      lunch: 'Roasted tomato soup & sourdough',
      dinner: 'Herb-crusted salmon with lentils',
    },
    Tuesday: {
      lunch: 'Farro salad with roasted squash',
      dinner: 'Slow-braised lamb with gremolata',
    },
    Wednesday: {
      lunch: 'Avocado toast with poached egg',
      dinner: 'Wild mushroom risotto',
    },
    Thursday: {
      lunch: 'Chickpea & spinach stew',
      dinner: 'Lemon thyme roast chicken',
    },
    Friday: {
      lunch: 'Burrata with heirloom tomatoes',
      dinner: 'Seared tuna with miso glaze',
    },
    Saturday: {
      lunch: 'Leek & potato frittata',
      dinner: 'Grilled lamb chops & tabbouleh',
    },
    Sunday: {
      lunch: 'Warm lentil & walnut salad',
      dinner: 'Slow-roasted pork with apple chutney',
    },
  },
  {
    Monday: {
      lunch: 'Miso soup with tofu & wakame',
      dinner: 'Beef short rib with polenta',
    },
    Tuesday: {
      lunch: 'Smoked salmon bagel board',
      dinner: 'Vegetable tagine with couscous',
    },
    Wednesday: {
      lunch: 'Grilled halloumi & peach salad',
      dinner: 'Duck breast with cherry reduction',
    },
    Thursday: {
      lunch: 'White bean & kale soup',
      dinner: 'Shrimp scampi with hand-cut pasta',
    },
    Friday: {
      lunch: 'Caprese panini & basil oil',
      dinner: 'Braised short ribs & celery root',
    },
    Saturday: {
      lunch: 'Shakshuka with feta & dill',
      dinner: 'Wood-fired pizza with seasonal veg',
    },
    Sunday: {
      lunch: 'Roasted beet & goat cheese bowl',
      dinner: 'Whole roasted branzino with herbs',
    },
  },
  {
    Monday: {
      lunch: 'Zucchini fritters with tzatziki',
      dinner: 'Stuffed bell peppers with quinoa',
    },
    Tuesday: {
      lunch: 'Pea & mint crostini',
      dinner: 'Pan-seared cod with caponata',
    },
    Wednesday: {
      lunch: 'Warm grain bowl, tahini drizzle',
      dinner: 'Osso buco with saffron risotto',
    },
    Thursday: {
      lunch: 'Gazpacho & olive oil toast',
      dinner: 'Harissa chicken thighs & yogurt',
    },
    Friday: {
      lunch: 'Niçoise salad with anchovies',
      dinner: 'Lobster bisque with crusty bread',
    },
    Saturday: {
      lunch: 'Mushroom & brie toastie',
      dinner: 'Slow-cooked oxtail with root veg',
    },
    Sunday: {
      lunch: 'Spring pea soup & sourdough',
      dinner: 'Rack of lamb with rosemary jus',
    },
  },
]

// Ingredients per menu set, grouped by category
const INGREDIENT_SETS = [
  {
    'Produce & Fresh Herbs': [
      'Cherry tomatoes (500g)',
      'Fresh sourdough loaf',
      'Butternut squash (1 large)',
      'Farro (200g)',
      'Avocados (2)',
      'Eggs (6)',
      'Wild mushrooms (400g)',
      'Arborio rice (300g)',
      'Chickpeas, dried (200g)',
      'Fresh spinach (300g)',
      'Heirloom tomatoes (4)',
      'Fresh thyme',
      'Leeks (3)',
      'Potatoes (600g)',
      'Lentils, green (250g)',
      'Walnuts (100g)',
      'Fresh rosemary',
      'Fresh parsley',
      'Garlic (2 heads)',
      'Shallots (6)',
    ],
    'Meat & Fish': [
      'Salmon fillets (4 × 180g)',
      'Lamb shoulder (1.2kg)',
      'Whole chicken (1.8kg)',
      'Tuna steaks (2 × 200g)',
      'Lamb chops (8)',
      'Pork shoulder (1.5kg)',
    ],
    'Dairy & Eggs': [
      'Burrata (2 balls)',
      'Parmesan (150g)',
      'Unsalted butter (250g)',
      'Crème fraîche (200ml)',
      'Free-range eggs (12)',
      'Pecorino (80g)',
    ],
    'Pantry & Dry Goods': [
      'Lentils, Puy (300g)',
      'Olive oil, extra virgin (1L)',
      'Dijon mustard (1 jar)',
      'Miso paste (150g)',
      'Arborio rice (500g)',
      'Vegetable stock (2L)',
      'Canned San Marzano tomatoes (2 tins)',
      'Dried chilli flakes',
      'Sea salt flakes',
      'Black pepper, whole',
      'Bay leaves',
      'Apple cider vinegar',
    ],
    'Condiments & Sauces': [
      'Soy sauce (low sodium)',
      'Tahini (200g)',
      'Capers (1 jar)',
      'Preserved lemons (1 jar)',
      'Harissa paste (1 jar)',
    ],
  },
  {
    'Produce & Fresh Herbs': [
      'Firm tofu (400g)',
      'Wakame seaweed (dried)',
      'Peaches (4)',
      'Kale (400g)',
      'White beans, dried (200g)',
      'Celery root (1 large)',
      'Beets (4 medium)',
      'Seasonal vegetables mix (1kg)',
      'Fresh dill',
      'Fresh basil',
      'Garlic (2 heads)',
      'Spring onions (1 bunch)',
      'Lemon (4)',
      'Cherry tomatoes (400g)',
    ],
    'Meat & Fish': [
      'Beef short rib (1.2kg)',
      'Smoked salmon (200g)',
      'Duck breasts (2)',
      'Shrimp, raw (500g)',
      'Braising short ribs (800g)',
      'Whole branzino (1.2kg)',
    ],
    'Dairy & Eggs': [
      'Halloumi (250g)',
      'Goat cheese (150g)',
      'Feta (200g)',
      'Mascarpone (200g)',
      'Eggs (8)',
      'Full-fat milk (500ml)',
    ],
    'Pantry & Dry Goods': [
      'Bagels (4)',
      'Couscous (300g)',
      'Hand-cut pasta (400g)',
      'Polenta (300g)',
      'Olive oil, extra virgin (1L)',
      'Chicken stock (1.5L)',
      'Canned chickpeas (2 tins)',
      'Ras el hanout spice mix',
      'Smoked paprika',
      'Cumin seeds',
      'Coriander seeds',
      'Dried oregano',
    ],
    'Condiments & Sauces': [
      'Cherry jam (1 jar)',
      'Basil oil (1 bottle)',
      'Caperberries (1 jar)',
      'White wine (1 bottle, for cooking)',
      'Pomegranate molasses',
    ],
  },
  {
    'Produce & Fresh Herbs': [
      'Zucchini (4 medium)',
      'Bell peppers, mixed (6)',
      'Peas, fresh or frozen (400g)',
      'Fresh mint',
      'Cauliflower (1 head)',
      'Mushrooms (500g)',
      'Spring peas (300g)',
      'Garlic (2 heads)',
      'Onions (4)',
      'Celery (1 bunch)',
      'Carrots (4)',
      'Lemons (5)',
      'Cucumber (2)',
      'Ripe tomatoes (1kg)',
      'Fresh tarragon',
    ],
    'Meat & Fish': [
      'Cod fillets (4 × 160g)',
      'Veal osso buco (4 pieces)',
      'Chicken thighs (8)',
      'Lobster bisque base (1 tin)',
      'Oxtail (1.5kg)',
      'Rack of lamb (1 full rack)',
    ],
    'Dairy & Eggs': [
      'Greek yoghurt (500g)',
      'Brie (200g)',
      'Eggs (10)',
      'Unsalted butter (200g)',
      'Cream (300ml)',
      'Pecorino romano (100g)',
    ],
    'Pantry & Dry Goods': [
      'Quinoa (300g)',
      'Saffron (1 small pinch)',
      'Arborio rice (400g)',
      'Sourdough bread (1 loaf)',
      'Olive oil, extra virgin (1L)',
      'Anchovies (1 tin)',
      'Caponata (1 jar, or ingredients to make)',
      'Harissa (1 jar)',
      'Tahini (150g)',
      'Crusty bread (1 loaf)',
      'Lamb stock (1L)',
      'Veal stock (1L)',
    ],
    'Condiments & Sauces': [
      'Tzatziki (or yoghurt + cucumber + dill)',
      'Rosemary jus base',
      'Niçoise olives (100g)',
      'Sun-dried tomatoes (100g)',
      'Red wine vinegar',
    ],
  },
]

const CATEGORY_COLORS = {
  'Produce & Fresh Herbs': {
    accent: '#7b9460',
    bg: 'rgba(123,148,96,.08)',
    border: 'rgba(123,148,96,.2)',
  },
  'Meat & Fish': {
    accent: '#b5713a',
    bg: 'rgba(181,113,58,.08)',
    border: 'rgba(181,113,58,.2)',
  },
  'Dairy & Eggs': {
    accent: '#c9a060',
    bg: 'rgba(201,160,96,.08)',
    border: 'rgba(201,160,96,.2)',
  },
  'Pantry & Dry Goods': {
    accent: '#8a7060',
    bg: 'rgba(138,112,96,.07)',
    border: 'rgba(138,112,96,.18)',
  },
  'Condiments & Sauces': {
    accent: '#9a6880',
    bg: 'rgba(154,104,128,.07)',
    border: 'rgba(154,104,128,.18)',
  },
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const LeafIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)
const SparkleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
)
const SunIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const MoonIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const SlidersIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
)
const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const BuildingIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M9 22V12h6v10" />
    <path d="M9 7h1" />
    <path d="M9 11h1" />
    <path d="M14 7h1" />
    <path d="M14 11h1" />
  </svg>
)
const ForkKnifeIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
)
const CheckIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const PlusIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)
const CartIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
)
const CalendarIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const RefreshIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 .49-3.49" />
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
const defaultPrefs = () => ({ officeOrEatOut: {}, mealFocus: {}, recipes: [] })

// Build initial checked state: all unchecked
const buildChecklist = (setIdx) => {
  const ingredients = INGREDIENT_SETS[setIdx] || INGREDIENT_SETS[0]
  const state = {}
  Object.entries(ingredients).forEach(([cat, items]) => {
    items.forEach((item) => {
      state[`${cat}::${item}`] = false
    })
  })
  return state
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function WeeklyMenuPlanner() {
  const [menu, setMenu] = useState(null)
  const [loading, setLoading] = useState(false)
  const [menuIndex, setMenuIndex] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [prefs, setPrefs] = useState(defaultPrefs())
  const [savedPrefs, setSavedPrefs] = useState(defaultPrefs())
  const [activeTab, setActiveTab] = useState('menu') // "menu" | "ingredients"
  const [checklist, setChecklist] = useState({})

  const generate = async () => {
    if (loading) return
    setLoading(true)
    setAnimating(true)
    setMenu(null)
    await new Promise((r) => setTimeout(r, 1800))
    const next = (menuIndex + 1) % MENU_SETS.length
    setMenuIndex(next)
    setMenu(MENU_SETS[next])
    setChecklist(buildChecklist(next))
    setLoading(false)
    setTimeout(() => setAnimating(false), 600)
  }

  const toggleItem = (key) => setChecklist((c) => ({ ...c, [key]: !c[key] }))

  const resetChecklist = () => setChecklist(buildChecklist(menuIndex))

  const handleSave = () => {
    setSavedPrefs(JSON.parse(JSON.stringify(prefs)))
    setPanelOpen(false)
  }
  const handleOpen = () => {
    setPrefs(JSON.parse(JSON.stringify(savedPrefs)))
    setPanelOpen(true)
  }

  const activeBadgeCount =
    Object.values(savedPrefs.officeOrEatOut).filter(Boolean).length +
    savedPrefs.recipes.length
  const isWeekend = (d) => d === 'Saturday' || d === 'Sunday'

  const ingredients = menu
    ? INGREDIENT_SETS[menuIndex] || INGREDIENT_SETS[0]
    : null
  const totalItems = Object.keys(checklist).length
  const checkedItems = Object.values(checklist).filter(Boolean).length
  const neededItems = totalItems - checkedItems

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600;1,700&family=Cormorant+SC:wght@600&display=swap');
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:.5}40%{transform:scale(1);opacity:1}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popIn{from{transform:scale(0.96) translateY(6px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes strikeIn{from{width:0}to{width:100%}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d4b896;border-radius:4px}
        input,textarea{outline:none}
        .ingredient-row:hover .ingredient-label { color: #3d2f1f !important; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background:
            'linear-gradient(160deg,#faf6f0 0%,#f5ede0 40%,#eee8d8 100%)',
          fontFamily: "'Cormorant Garamond','Georgia',serif",
          padding: '0 0 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambiance */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'fixed',
            top: '-120px',
            right: '-80px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle,rgba(193,120,82,.07) 0%,transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'fixed',
            bottom: '-100px',
            left: '-60px',
            width: '360px',
            height: '360px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle,rgba(120,148,94,.08) 0%,transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '1160px',
            margin: '0 auto',
            padding: '0 32px',
          }}
        >
          {/* ── Page Header ── */}
          <header
            style={{
              textAlign: 'center',
              paddingTop: '64px',
              paddingBottom: '48px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <div style={{ color: '#7b9460', opacity: 0.8 }}>
                <LeafIcon />
              </div>
              <span
                style={{
                  fontFamily: "'Cormorant SC','Cormorant Garamond',serif",
                  fontSize: '11px',
                  letterSpacing: '.25em',
                  textTransform: 'uppercase',
                  color: '#9a7c5a',
                  fontWeight: 600,
                }}
              >
                Seasonal · Thoughtful · Nourishing
              </span>
              <div style={{ color: '#7b9460', opacity: 0.8 }}>
                <LeafIcon />
              </div>
            </div>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 'clamp(42px,6vw,72px)',
                fontWeight: 300,
                color: '#3d2f1f',
                letterSpacing: '-.01em',
                lineHeight: 1.1,
                margin: '0 0 8px',
              }}
            >
              Weekly Menu
            </h1>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: 'clamp(28px,4vw,46px)',
                fontWeight: 600,
                color: '#b5713a',
                fontStyle: 'italic',
                margin: '0 0 36px',
                letterSpacing: '.02em',
              }}
            >
              Planner
            </h2>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={generate}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 36px',
                  background: loading
                    ? 'linear-gradient(135deg,#c1905a,#9a6e3a)'
                    : 'linear-gradient(135deg,#b5713a 0%,#8a4e20 100%)',
                  color: '#fdf6ec',
                  border: 'none',
                  borderRadius: '2px',
                  fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: '17px',
                  fontWeight: 600,
                  letterSpacing: '.06em',
                  cursor: loading ? 'wait' : 'pointer',
                  boxShadow: '0 6px 32px rgba(138,78,32,.35)',
                  transition: 'all .3s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform =
                      'translateY(-2px) scale(1.02)'
                    e.currentTarget.style.boxShadow =
                      '0 10px 40px rgba(138,78,32,.45)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow =
                      '0 6px 32px rgba(138,78,32,.35)'
                  }
                }}
              >
                {loading ? (
                  <>
                    <LoadingDots />
                    <span>Curating your menu…</span>
                  </>
                ) : (
                  <>
                    <SparkleIcon />
                    <span>Generate Weekly Menu</span>
                  </>
                )}
              </button>

              <button
                onClick={handleOpen}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '15px 24px',
                  background: 'transparent',
                  color: '#7b6248',
                  border: '1.5px solid rgba(181,113,58,.35)',
                  borderRadius: '2px',
                  fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: '16px',
                  fontWeight: 600,
                  letterSpacing: '.04em',
                  cursor: 'pointer',
                  transition: 'all .25s ease',
                  outline: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(181,113,58,.06)'
                  e.currentTarget.style.borderColor = 'rgba(181,113,58,.6)'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(181,113,58,.35)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <SlidersIcon />
                <span>Preferences</span>
                {activeBadgeCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#b5713a',
                      color: '#fdf6ec',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '10px',
                      fontFamily: 'sans-serif',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(138,78,32,.4)',
                    }}
                  >
                    {activeBadgeCount}
                  </span>
                )}
              </button>
            </div>

            {!menu && !loading && (
              <p
                style={{
                  marginTop: '20px',
                  color: '#9a7c5a',
                  fontSize: '15px',
                  fontStyle: 'italic',
                  opacity: 0.75,
                }}
              >
                Let the season guide your table
              </p>
            )}
          </header>

          {/* ── Decorative divider ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '36px',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background:
                  'linear-gradient(to right,transparent,#c9a87a,transparent)',
              }}
            />
            <div style={{ color: '#c9a87a', fontSize: '18px', opacity: 0.6 }}>
              ◆
            </div>
            <div
              style={{
                flex: 1,
                height: '1px',
                background:
                  'linear-gradient(to right,transparent,#c9a87a,transparent)',
              }}
            />
          </div>

          {/* ── Main Tabs ── */}
          <div
            style={{
              display: 'flex',
              gap: '0',
              marginBottom: '36px',
              borderBottom: '1px solid rgba(193,168,120,.3)',
            }}
          >
            <MainTab
              id="menu"
              label="Menu"
              icon={<CalendarIcon />}
              active={activeTab === 'menu'}
              onClick={setActiveTab}
            />
            <MainTab
              id="ingredients"
              label="Shopping List"
              icon={<CartIcon />}
              active={activeTab === 'ingredients'}
              onClick={setActiveTab}
              badge={menu && neededItems > 0 ? neededItems : null}
              disabled={!menu}
            />
          </div>

          {/* ══════════ MENU TAB ══════════ */}
          {activeTab === 'menu' && (
            <>
              {/* Week header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '28px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: "'Cormorant SC','Cormorant Garamond',serif",
                      fontSize: '11px',
                      letterSpacing: '.22em',
                      textTransform: 'uppercase',
                      color: '#9a7c5a',
                      fontWeight: 600,
                    }}
                  >
                    Week 19 · 2026
                  </span>
                  <h3
                    style={{
                      margin: '4px 0 0',
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: '22px',
                      fontWeight: 300,
                      color: '#3d2f1f',
                      letterSpacing: '-.01em',
                    }}
                  >
                    May 11 – May 17
                  </h3>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    background: 'rgba(123,148,96,.1)',
                    border: '1px solid rgba(123,148,96,.25)',
                    borderRadius: '20px',
                  }}
                >
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#7b9460',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'sans-serif',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: '#7b9460',
                    }}
                  >
                    Spring Season
                  </span>
                </div>
              </div>

              {/* Day cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                  gap: '20px',
                }}
              >
                {DAYS.map((day, i) => (
                  <DayCard
                    key={day}
                    day={day}
                    lunch={menu?.[day]?.lunch}
                    dinner={menu?.[day]?.dinner}
                    loading={loading}
                    animating={animating}
                    index={i}
                    isWeekend={isWeekend(day)}
                    dayPref={savedPrefs.officeOrEatOut[day]}
                    mealFocus={savedPrefs.mealFocus[day]}
                  />
                ))}
              </div>

              {/* AI Reasoning box */}
              <div
                style={{
                  marginTop: '52px',
                  background: 'linear-gradient(135deg,#fefcf8,#faf5ea)',
                  border: '1px solid rgba(193,168,120,.22)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '18px 28px',
                    borderBottom: '1px solid rgba(193,168,120,.18)',
                    background: 'rgba(181,113,58,.04)',
                  }}
                >
                  <SparkleIcon />
                  <span
                    style={{
                      fontFamily: "'Cormorant SC','Cormorant Garamond',serif",
                      fontSize: '11px',
                      letterSpacing: '.2em',
                      textTransform: 'uppercase',
                      color: '#9a7c5a',
                      fontWeight: 600,
                    }}
                  >
                    Behind this menu · AI Reasoning
                  </span>
                </div>
                <div style={{ padding: '24px 28px 28px' }}>
                  <p
                    style={{
                      margin: '0 0 14px',
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: '17px',
                      lineHeight: 1.75,
                      color: '#4a3520',
                    }}
                  >
                    This week's menu was crafted around the transition into{' '}
                    <em>mid-spring</em>, favouring light proteins, fresh
                    alliums, and the first tender legumes of the season. Monday
                    opens gently with a restorative tomato broth before building
                    into richer textures mid-week.
                  </p>
                  <p
                    style={{
                      margin: '0 0 14px',
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: '17px',
                      lineHeight: 1.75,
                      color: '#4a3520',
                    }}
                  >
                    Wednesday's mushroom risotto acts as an anchor — a
                    comforting, plant-forward dish that balances the week's
                    heavier dinners. The weekend pivots to slow-cooked,
                    hands-off recipes suited to a more relaxed pace, while
                    lunches stay bright and minimal throughout.
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: '17px',
                      lineHeight: 1.75,
                      color: '#4a3520',
                    }}
                  >
                    Nutritional balance, seasonal availability, and variety of
                    cooking technique were all considered. No ingredient repeats
                    across more than two days, and each dinner complements the
                    lunch preceding it without creating flavour fatigue.
                  </p>
                  <div
                    style={{
                      marginTop: '22px',
                      paddingTop: '18px',
                      borderTop: '1px solid rgba(193,168,120,.2)',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {[
                      'Seasonal',
                      'Balanced',
                      'Varied technique',
                      'Low repetition',
                      'Spring produce',
                    ].map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '11px',
                          letterSpacing: '.1em',
                          textTransform: 'uppercase',
                          fontFamily: 'sans-serif',
                          fontWeight: 700,
                          padding: '4px 12px',
                          borderRadius: '20px',
                          background: 'rgba(181,113,58,.08)',
                          color: '#9a6040',
                          border: '1px solid rgba(181,113,58,.18)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ══════════ INGREDIENTS TAB ══════════ */}
          {activeTab === 'ingredients' && (
            <>
              {!menu ? (
                <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                  <div
                    style={{
                      fontSize: '48px',
                      marginBottom: '20px',
                      opacity: 0.3,
                    }}
                  >
                    🛒
                  </div>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: '20px',
                      color: '#9a7c5a',
                      fontStyle: 'italic',
                    }}
                  >
                    Generate a menu first to see your shopping list
                  </p>
                </div>
              ) : (
                <>
                  {/* Ingredients header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                      marginBottom: '32px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily:
                            "'Cormorant SC','Cormorant Garamond',serif",
                          fontSize: '11px',
                          letterSpacing: '.22em',
                          textTransform: 'uppercase',
                          color: '#9a7c5a',
                          fontWeight: 600,
                        }}
                      >
                        Week 19 · 2026
                      </span>
                      <h3
                        style={{
                          margin: '4px 0 6px',
                          fontFamily: "'Cormorant Garamond',Georgia,serif",
                          fontSize: '26px',
                          fontWeight: 300,
                          color: '#3d2f1f',
                        }}
                      >
                        Shopping List
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Cormorant Garamond',Georgia,serif",
                          fontSize: '15px',
                          color: '#9a7c5a',
                          fontStyle: 'italic',
                        }}
                      >
                        Tick what you already have. What remains is your
                        shopping list.
                      </p>
                    </div>

                    {/* Progress + reset */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '10px',
                      }}
                    >
                      {/* Progress pill */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 18px',
                          background: 'linear-gradient(135deg,#fefcf8,#faf5ea)',
                          border: '1px solid rgba(193,168,120,.22)',
                          borderRadius: '30px',
                        }}
                      >
                        <div
                          style={{
                            width: '80px',
                            height: '6px',
                            background: 'rgba(193,168,120,.25)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${totalItems > 0 ? (checkedItems / totalItems) * 100 : 0}%`,
                              background:
                                'linear-gradient(to right,#7b9460,#a3b87a)',
                              borderRadius: '3px',
                              transition: 'width .4s ease',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: 'sans-serif',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#7b6248',
                            letterSpacing: '.04em',
                          }}
                        >
                          {checkedItems}/{totalItems} in fridge
                        </span>
                      </div>

                      {/* Reset button */}
                      <button
                        onClick={resetChecklist}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          background: 'transparent',
                          border: '1px solid rgba(193,168,120,.35)',
                          borderRadius: '20px',
                          fontFamily: 'sans-serif',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          textTransform: 'uppercase',
                          color: '#9a7c5a',
                          cursor: 'pointer',
                          transition: 'all .2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#b5713a'
                          e.currentTarget.style.color = '#b5713a'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            'rgba(193,168,120,.35)'
                          e.currentTarget.style.color = '#9a7c5a'
                        }}
                      >
                        <RefreshIcon /> Reset all
                      </button>
                    </div>
                  </div>

                  {/* Shopping summary banner — only shown when some items are checked */}
                  {checkedItems > 0 && neededItems > 0 && (
                    <div
                      style={{
                        marginBottom: '28px',
                        padding: '14px 22px',
                        background:
                          'linear-gradient(135deg,rgba(181,113,58,.06),rgba(181,113,58,.03))',
                        border: '1px solid rgba(181,113,58,.18)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'popIn .3s ease',
                      }}
                    >
                      <CartIcon />
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Cormorant Garamond',Georgia,serif",
                          fontSize: '16px',
                          color: '#7b5030',
                        }}
                      >
                        You need to buy{' '}
                        <strong>
                          {neededItems} item{neededItems !== 1 ? 's' : ''}
                        </strong>{' '}
                        — the ones not yet ticked below.
                      </p>
                    </div>
                  )}
                  {neededItems === 0 && totalItems > 0 && (
                    <div
                      style={{
                        marginBottom: '28px',
                        padding: '14px 22px',
                        background:
                          'linear-gradient(135deg,rgba(123,148,96,.08),rgba(123,148,96,.04))',
                        border: '1px solid rgba(123,148,96,.22)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'popIn .3s ease',
                      }}
                    >
                      <CheckIcon />
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "'Cormorant Garamond',Georgia,serif",
                          fontSize: '16px',
                          color: '#4a6830',
                          fontStyle: 'italic',
                        }}
                      >
                        Your fridge is stocked — nothing to buy this week!
                      </p>
                    </div>
                  )}

                  {/* Category sections */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                    }}
                  >
                    {Object.entries(ingredients).map(
                      ([category, items], ci) => {
                        const colors =
                          CATEGORY_COLORS[category] ||
                          CATEGORY_COLORS['Pantry & Dry Goods']
                        const catChecked = items.filter(
                          (item) => checklist[`${category}::${item}`],
                        ).length
                        return (
                          <div
                            key={category}
                            style={{
                              background:
                                'linear-gradient(135deg,#fefcf8,#faf5ea)',
                              border: `1px solid ${colors.border}`,
                              borderRadius: '4px',
                              overflow: 'hidden',
                              animation: `popIn .3s ease ${ci * 60}ms both`,
                            }}
                          >
                            {/* Category header */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 22px',
                                borderBottom: `1px solid ${colors.border}`,
                                background: colors.bg,
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}
                              >
                                <div
                                  style={{
                                    width: '3px',
                                    height: '20px',
                                    borderRadius: '2px',
                                    background: colors.accent,
                                  }}
                                />
                                <span
                                  style={{
                                    fontFamily:
                                      "'Cormorant SC','Cormorant Garamond',serif",
                                    fontSize: '13px',
                                    letterSpacing: '.18em',
                                    textTransform: 'uppercase',
                                    color: colors.accent,
                                    fontWeight: 600,
                                  }}
                                >
                                  {category}
                                </span>
                              </div>
                              <span
                                style={{
                                  fontFamily: 'sans-serif',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: colors.accent,
                                  opacity: 0.7,
                                  letterSpacing: '.06em',
                                }}
                              >
                                {catChecked}/{items.length}
                              </span>
                            </div>

                            {/* Items */}
                            <div style={{ padding: '8px 0' }}>
                              {items.map((item, idx) => {
                                const key = `${category}::${item}`
                                const checked = checklist[key] || false
                                return (
                                  <div
                                    key={item}
                                    className="ingredient-row"
                                    onClick={() => toggleItem(key)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '14px',
                                      padding: '10px 22px',
                                      cursor: 'pointer',
                                      transition: 'background .15s',
                                      background: checked
                                        ? 'rgba(123,148,96,.04)'
                                        : 'transparent',
                                      borderBottom:
                                        idx < items.length - 1
                                          ? '1px solid rgba(193,168,120,.1)'
                                          : 'none',
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background =
                                        checked
                                          ? 'rgba(123,148,96,.07)'
                                          : 'rgba(193,168,120,.07)')
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background =
                                        checked
                                          ? 'rgba(123,148,96,.04)'
                                          : 'transparent')
                                    }
                                  >
                                    {/* Custom checkbox */}
                                    <div
                                      style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px',
                                        flexShrink: 0,
                                        border: `1.5px solid ${checked ? colors.accent : 'rgba(193,168,120,.5)'}`,
                                        background: checked
                                          ? colors.accent
                                          : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all .2s',
                                        boxShadow: checked
                                          ? `0 2px 8px ${colors.accent}40`
                                          : 'none',
                                      }}
                                    >
                                      {checked && (
                                        <svg
                                          width="11"
                                          height="11"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="white"
                                          strokeWidth="3.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      )}
                                    </div>

                                    {/* Label with strikethrough */}
                                    <span
                                      className="ingredient-label"
                                      style={{
                                        fontFamily:
                                          "'Cormorant Garamond',Georgia,serif",
                                        fontSize: '16px',
                                        color: checked ? '#a09080' : '#4a3520',
                                        textDecoration: checked
                                          ? 'line-through'
                                          : 'none',
                                        textDecorationColor:
                                          'rgba(160,144,128,.6)',
                                        transition: 'all .25s',
                                        letterSpacing: '.01em',
                                        flex: 1,
                                        userSelect: 'none',
                                      }}
                                    >
                                      {item}
                                    </span>

                                    {/* "In fridge" tag */}
                                    {checked && (
                                      <span
                                        style={{
                                          fontFamily: 'sans-serif',
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          letterSpacing: '.1em',
                                          textTransform: 'uppercase',
                                          color: colors.accent,
                                          opacity: 0.8,
                                          flexShrink: 0,
                                        }}
                                      >
                                        ✓ In fridge
                                      </span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      },
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <footer style={{ textAlign: 'center', marginTop: '60px' }}>
            <div
              style={{
                height: '1px',
                background:
                  'linear-gradient(to right,transparent,rgba(193,120,82,.25),transparent)',
                marginBottom: '24px',
              }}
            />
            <p
              style={{
                color: '#b09070',
                fontSize: '13px',
                letterSpacing: '.08em',
                fontStyle: 'italic',
              }}
            >
              Good food, simply planned
            </p>
          </footer>
        </div>
      </div>

      {panelOpen && (
        <PreferencesPanel
          prefs={prefs}
          setPrefs={setPrefs}
          onClose={() => setPanelOpen(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}

// ── Main Tab Button ───────────────────────────────────────────────────────────
function MainTab({ id, label, icon, active, onClick, badge, disabled }) {
  return (
    <button
      onClick={() => !disabled && onClick(id)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 28px',
        background: 'none',
        border: 'none',
        borderBottom: `2.5px solid ${active ? '#b5713a' : 'transparent'}`,
        color: active ? '#8a4e20' : disabled ? '#c9b89a' : '#9a7c5a',
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: '17px',
        fontWeight: active ? 700 : 500,
        letterSpacing: '.03em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .2s',
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.color = '#7b6248'
          e.currentTarget.style.borderBottomColor = 'rgba(181,113,58,.3)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !active) {
          e.currentTarget.style.color = '#9a7c5a'
          e.currentTarget.style.borderBottomColor = 'transparent'
        }
      }}
    >
      {icon}
      {label}
      {badge && (
        <span
          style={{
            background: '#b5713a',
            color: '#fdf6ec',
            borderRadius: '20px',
            padding: '1px 7px',
            fontSize: '11px',
            fontFamily: 'sans-serif',
            fontWeight: 700,
            marginLeft: '2px',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Preferences Panel ─────────────────────────────────────────────────────────
function PreferencesPanel({ prefs, setPrefs, onClose, onSave }) {
  const [tab, setTab] = useState('schedule')
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    meal: 'both',
    notes: '',
  })

  const toggleDayMode = (day, mode) =>
    setPrefs((p) => {
      const next = { ...p, officeOrEatOut: { ...p.officeOrEatOut } }
      next.officeOrEatOut[day] = next.officeOrEatOut[day] === mode ? null : mode
      return next
    })
  const toggleFocus = (day, focus) =>
    setPrefs((p) => {
      const next = { ...p, mealFocus: { ...p.mealFocus } }
      next.mealFocus[day] = next.mealFocus[day] === focus ? null : focus
      return next
    })
  const addRecipe = () => {
    if (!newRecipe.name.trim()) return
    setPrefs((p) => ({
      ...p,
      recipes: [...p.recipes, { id: Date.now(), ...newRecipe }],
    }))
    setNewRecipe({ name: '', meal: 'both', notes: '' })
  }
  const removeRecipe = (id) =>
    setPrefs((p) => ({ ...p, recipes: p.recipes.filter((r) => r.id !== id) }))

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1,
        padding: '13px 0',
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${tab === id ? '#b5713a' : 'transparent'}`,
        color: tab === id ? '#8a4e20' : '#9a7c5a',
        fontFamily: "'Cormorant Garamond',Georgia,serif",
        fontSize: '16px',
        fontWeight: tab === id ? 700 : 500,
        letterSpacing: '.04em',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(40,25,10,.38)',
          zIndex: 100,
          animation: 'fadeIn .25s ease',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(540px,100vw)',
          background: 'linear-gradient(170deg,#faf6f0,#f5ede0)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-16px 0 60px rgba(60,35,10,.2)',
          animation: 'slideIn .35s cubic-bezier(.22,1,.36,1)',
        }}
      >
        <div style={{ padding: '32px 32px 0', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <div style={{ color: '#b5713a' }}>
                  <SlidersIcon />
                </div>
                <span
                  style={{
                    fontFamily: "'Cormorant SC','Cormorant Garamond',serif",
                    fontSize: '11px',
                    letterSpacing: '.2em',
                    textTransform: 'uppercase',
                    color: '#9a7c5a',
                    fontWeight: 600,
                  }}
                >
                  Meal Planning
                </span>
              </div>
              <h2
                style={{
                  margin: '0 0 4px',
                  fontFamily: "'Cormorant Garamond',Georgia,serif",
                  fontSize: '30px',
                  fontWeight: 600,
                  color: '#3d2f1f',
                }}
              >
                Preferences
              </h2>
              <p
                style={{
                  margin: 0,
                  color: '#9a7c5a',
                  fontSize: '14px',
                  fontStyle: 'italic',
                }}
              >
                Tailor the menu to your week
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(193,168,120,.15)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#7b6248',
                flexShrink: 0,
                transition: 'background .2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(193,168,120,.3)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(193,168,120,.15)')
              }
            >
              <CloseIcon />
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(193,168,120,.25)',
            }}
          >
            <TabBtn id="schedule" label="Weekly Schedule" />
            <TabBtn id="recipes" label="My Recipes" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {tab === 'schedule' && (
            <div>
              <p
                style={{
                  margin: '0 0 22px',
                  color: '#7b6248',
                  fontSize: '14px',
                  lineHeight: 1.65,
                }}
              >
                Mark days you'll be at the office or eating out, then set which
                meal needs planning at home.
              </p>
              {DAYS.map((day, i) => {
                const mode = prefs.officeOrEatOut[day]
                const focus = prefs.mealFocus[day]
                const isWk = day === 'Saturday' || day === 'Sunday'
                return (
                  <div
                    key={day}
                    style={{
                      marginBottom: '14px',
                      background: 'linear-gradient(135deg,#fefcf8,#faf5ea)',
                      border: `1px solid ${isWk ? 'rgba(181,113,58,.22)' : 'rgba(193,168,120,.16)'}`,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      animation: `popIn .25s ease ${i * 35}ms both`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div
                        style={{
                          width: '4px',
                          flexShrink: 0,
                          background: isWk
                            ? 'linear-gradient(#b5713a,#c9a060)'
                            : 'linear-gradient(#7b9460,#a3b87a)',
                        }}
                      />
                      <div style={{ flex: 1, padding: '14px 18px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '12px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Cormorant Garamond',Georgia,serif",
                              fontSize: '20px',
                              fontWeight: isWk ? 700 : 600,
                              color: isWk ? '#8a4e20' : '#3d2f1f',
                              fontStyle: isWk ? 'italic' : 'normal',
                            }}
                          >
                            {day}
                          </span>
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              flexWrap: 'wrap',
                            }}
                          >
                            <ModePill
                              label="Office"
                              icon={<BuildingIcon />}
                              active={mode === 'office'}
                              onClick={() => toggleDayMode(day, 'office')}
                              activeColor="#7b9460"
                              activeBg="rgba(123,148,96,.13)"
                            />
                            <ModePill
                              label="Eat Out"
                              icon={<ForkKnifeIcon />}
                              active={mode === 'eatout'}
                              onClick={() => toggleDayMode(day, 'eatout')}
                              activeColor="#b5713a"
                              activeBg="rgba(181,113,58,.12)"
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(193,168,120,.18)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              letterSpacing: '.14em',
                              textTransform: 'uppercase',
                              color: '#b09070',
                              fontFamily: 'sans-serif',
                              fontWeight: 700,
                              marginRight: '2px',
                            }}
                          >
                            Plan:
                          </span>
                          {['Lunch', 'Dinner', 'Both'].map((f) => (
                            <FocusPill
                              key={f}
                              label={f}
                              active={focus === f.toLowerCase()}
                              onClick={() => toggleFocus(day, f.toLowerCase())}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab === 'recipes' && (
            <div>
              <p
                style={{
                  margin: '0 0 22px',
                  color: '#7b6248',
                  fontSize: '14px',
                  lineHeight: 1.65,
                }}
              >
                Add recipes you'd like included when generating the menu.
              </p>
              <div
                style={{
                  background: 'linear-gradient(135deg,#fefcf8,#faf5ea)',
                  border: '1.5px dashed rgba(181,113,58,.35)',
                  borderRadius: '4px',
                  padding: '22px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ color: '#b5713a' }}>
                    <PlusIcon />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      letterSpacing: '.16em',
                      textTransform: 'uppercase',
                      color: '#b5713a',
                      fontFamily: 'sans-serif',
                      fontWeight: 700,
                    }}
                  >
                    Add a Recipe
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Recipe name…"
                  value={newRecipe.name}
                  onChange={(e) =>
                    setNewRecipe((r) => ({ ...r, name: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'rgba(250,246,240,.9)',
                    border: '1px solid rgba(193,168,120,.3)',
                    borderRadius: '2px',
                    fontFamily: "'Cormorant Garamond',Georgia,serif",
                    fontSize: '16px',
                    color: '#3d2f1f',
                    marginBottom: '10px',
                    transition: 'border .2s',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'rgba(181,113,58,.65)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = 'rgba(193,168,120,.3)')
                  }
                />
                <textarea
                  placeholder="Notes or dietary info (optional)…"
                  value={newRecipe.notes}
                  rows={2}
                  onChange={(e) =>
                    setNewRecipe((r) => ({ ...r, notes: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    background: 'rgba(250,246,240,.9)',
                    border: '1px solid rgba(193,168,120,.3)',
                    borderRadius: '2px',
                    fontFamily: "'Cormorant Garamond',Georgia,serif",
                    fontSize: '15px',
                    color: '#3d2f1f',
                    resize: 'vertical',
                    marginBottom: '14px',
                    transition: 'border .2s',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'rgba(181,113,58,.65)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = 'rgba(193,168,120,.3)')
                  }
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        letterSpacing: '.13em',
                        textTransform: 'uppercase',
                        color: '#b09070',
                        fontFamily: 'sans-serif',
                        fontWeight: 700,
                      }}
                    >
                      For:
                    </span>
                    {['Lunch', 'Dinner', 'Both'].map((f) => (
                      <FocusPill
                        key={f}
                        label={f}
                        active={newRecipe.meal === f.toLowerCase()}
                        onClick={() =>
                          setNewRecipe((r) => ({ ...r, meal: f.toLowerCase() }))
                        }
                      />
                    ))}
                  </div>
                  <button
                    onClick={addRecipe}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 20px',
                      background: 'linear-gradient(135deg,#b5713a,#8a4e20)',
                      color: '#fdf6ec',
                      border: 'none',
                      borderRadius: '2px',
                      fontFamily: "'Cormorant Garamond',Georgia,serif",
                      fontSize: '15px',
                      fontWeight: 600,
                      letterSpacing: '.04em',
                      cursor: 'pointer',
                      transition: 'opacity .2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = '.85')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <PlusIcon /> Add
                  </button>
                </div>
              </div>
              {prefs.recipes.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    color: '#c4a87a',
                    fontStyle: 'italic',
                    fontSize: '15px',
                    opacity: 0.7,
                  }}
                >
                  No recipes added yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {prefs.recipes.map((r, i) => {
                    const mc =
                      r.meal === 'lunch'
                        ? '#7b9460'
                        : r.meal === 'dinner'
                          ? '#6d5fa0'
                          : '#b5713a'
                    const mb =
                      r.meal === 'lunch'
                        ? 'rgba(123,148,96,.1)'
                        : r.meal === 'dinner'
                          ? 'rgba(109,95,160,.1)'
                          : 'rgba(181,113,58,.1)'
                    return (
                      <div
                        key={r.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          padding: '16px 18px',
                          background: 'linear-gradient(135deg,#fefcf8,#faf5ea)',
                          border: '1px solid rgba(193,168,120,.16)',
                          borderRadius: '4px',
                          animation: `popIn .2s ease ${i * 40}ms both`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              flexWrap: 'wrap',
                              marginBottom: r.notes ? '5px' : '0',
                            }}
                          >
                            <span
                              style={{
                                fontFamily:
                                  "'Cormorant Garamond',Georgia,serif",
                                fontSize: '17px',
                                fontWeight: 600,
                                color: '#3d2f1f',
                              }}
                            >
                              {r.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                letterSpacing: '.12em',
                                textTransform: 'uppercase',
                                fontFamily: 'sans-serif',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '20px',
                                background: mb,
                                color: mc,
                              }}
                            >
                              {r.meal}
                            </span>
                          </div>
                          {r.notes && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#9a7c5a',
                                fontStyle: 'italic',
                                lineHeight: 1.5,
                              }}
                            >
                              {r.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeRecipe(r.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#c4a87a',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'color .2s',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = '#b5713a')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = '#c4a87a')
                          }
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '20px 32px',
            borderTop: '1px solid rgba(193,168,120,.2)',
            background: 'rgba(250,246,240,.96)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                background: 'transparent',
                border: '1.5px solid rgba(181,113,58,.3)',
                borderRadius: '2px',
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: '15px',
                fontWeight: 600,
                color: '#9a7c5a',
                cursor: 'pointer',
                letterSpacing: '.04em',
                transition: 'all .2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(181,113,58,.55)'
                e.currentTarget.style.color = '#7b6248'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(181,113,58,.3)'
                e.currentTarget.style.color = '#9a7c5a'
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              style={{
                flex: 2,
                padding: '13px',
                background: 'linear-gradient(135deg,#b5713a 0%,#8a4e20 100%)',
                border: 'none',
                borderRadius: '2px',
                fontFamily: "'Cormorant Garamond',Georgia,serif",
                fontSize: '16px',
                fontWeight: 700,
                color: '#fdf6ec',
                cursor: 'pointer',
                letterSpacing: '.05em',
                boxShadow: '0 4px 20px rgba(138,78,32,.3)',
                transition: 'all .2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow =
                  '0 7px 28px rgba(138,78,32,.42)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgba(138,78,32,.3)'
              }}
            >
              <CheckIcon /> Save Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function ModePill({ label, icon, active, onClick, activeColor, activeBg }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 12px',
        background: active ? activeBg : 'transparent',
        border: `1px solid ${active ? activeColor : 'rgba(193,168,120,.35)'}`,
        borderRadius: '20px',
        color: active ? activeColor : '#9a7c5a',
        fontFamily: 'sans-serif',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = activeColor
          e.currentTarget.style.color = activeColor
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgba(193,168,120,.35)'
          e.currentTarget.style.color = '#9a7c5a'
        }
      }}
    >
      {icon}
      {label}
    </button>
  )
}
function FocusPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 13px',
        background: active ? 'rgba(181,113,58,.13)' : 'transparent',
        border: `1px solid ${active ? '#b5713a' : 'rgba(193,168,120,.3)'}`,
        borderRadius: '20px',
        color: active ? '#8a4e20' : '#9a7c5a',
        fontFamily: 'sans-serif',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '.07em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all .2s',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#b5713a'
          e.currentTarget.style.color = '#b5713a'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgba(193,168,120,.3)'
          e.currentTarget.style.color = '#9a7c5a'
        }
      }}
    >
      {label}
    </button>
  )
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({
  day,
  lunch,
  dinner,
  loading,
  animating,
  index,
  isWeekend,
  dayPref,
  mealFocus,
}) {
  const delay = `${index * 80}ms`
  const badge =
    dayPref === 'office'
      ? {
          label: 'Office',
          color: '#7b9460',
          bg: 'rgba(123,148,96,.1)',
          icon: <BuildingIcon />,
        }
      : dayPref === 'eatout'
        ? {
            label: 'Eating Out',
            color: '#b5713a',
            bg: 'rgba(181,113,58,.1)',
            icon: <ForkKnifeIcon />,
          }
        : null

  return (
    <div
      style={{
        background: isWeekend
          ? 'linear-gradient(145deg,#fdf8f0,#f9f0e2)'
          : 'linear-gradient(145deg,#fefcf8,#faf5ea)',
        borderRadius: '3px',
        border: isWeekend
          ? '1px solid rgba(181,113,58,.2)'
          : '1px solid rgba(193,168,120,.15)',
        boxShadow: isWeekend
          ? '0 4px 24px rgba(138,78,32,.1),0 1px 4px rgba(0,0,0,.04)'
          : '0 4px 20px rgba(100,80,40,.07),0 1px 3px rgba(0,0,0,.03)',
        overflow: 'hidden',
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(10px)' : 'translateY(0)',
        transition: `opacity .5s ease ${delay},transform .5s ease ${delay}`,
      }}
    >
      <div
        style={{
          height: '3px',
          background: isWeekend
            ? 'linear-gradient(to right,#b5713a,#c9a060)'
            : 'linear-gradient(to right,#7b9460,#a3b87a)',
        }}
      />
      <div
        style={{
          padding: '18px 22px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <h3
          style={{
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: '22px',
            fontWeight: isWeekend ? 700 : 600,
            color: isWeekend ? '#8a4e20' : '#3d2f1f',
            margin: 0,
            fontStyle: isWeekend ? 'italic' : 'normal',
          }}
        >
          {day}
        </h3>
        <div
          style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {badge && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '20px',
                background: badge.bg,
                color: badge.color,
              }}
            >
              {badge.icon}
              {badge.label}
            </span>
          )}
          {!badge && isWeekend && (
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '.15em',
                textTransform: 'uppercase',
                color: '#b5713a',
                opacity: 0.7,
                fontFamily: 'sans-serif',
                fontWeight: 600,
              }}
            >
              Weekend
            </span>
          )}
        </div>
      </div>
      {mealFocus && (
        <div
          style={{
            margin: '-4px 22px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            background: 'rgba(181,113,58,.07)',
            borderRadius: '20px',
            border: '1px solid rgba(181,113,58,.18)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: '#b5713a',
              fontFamily: 'sans-serif',
              fontWeight: 700,
            }}
          >
            Planning: {mealFocus}
          </span>
        </div>
      )}
      <MealSection
        icon={<SunIcon />}
        label="Lunch"
        meal={lunch}
        loading={loading}
        accentColor={isWeekend ? '#b5713a' : '#7b9460'}
        padding="0 22px 18px"
        dimmed={mealFocus === 'dinner'}
      />
      <div
        style={{
          margin: '0 22px',
          height: '1px',
          background:
            'linear-gradient(to right,transparent,rgba(193,168,120,.35),transparent)',
        }}
      />
      <MealSection
        icon={<MoonIcon />}
        label="Dinner"
        meal={dinner}
        loading={loading}
        accentColor={isWeekend ? '#b5713a' : '#7b9460'}
        padding="18px 22px 22px"
        dimmed={mealFocus === 'lunch'}
      />
    </div>
  )
}

function MealSection({
  icon,
  label,
  meal,
  loading,
  accentColor,
  padding,
  dimmed,
}) {
  return (
    <div
      style={{ padding, opacity: dimmed ? 0.4 : 1, transition: 'opacity .3s' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '7px',
        }}
      >
        <span
          style={{
            color: accentColor,
            opacity: 0.75,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: accentColor,
            fontFamily: 'sans-serif',
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          {label}
        </span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <ShimmerBar width="85%" />
          <ShimmerBar width="60%" />
        </div>
      ) : meal ? (
        <p
          style={{
            margin: 0,
            fontFamily: "'Cormorant Garamond',Georgia,serif",
            fontSize: '16px',
            lineHeight: 1.45,
            color: '#4a3520',
            fontWeight: 400,
            letterSpacing: '.01em',
          }}
        >
          {meal}
        </p>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#c4a87a',
            fontStyle: 'italic',
            opacity: 0.6,
            fontFamily: "'Cormorant Garamond',Georgia,serif",
          }}
        >
          Not yet planned
        </p>
      )}
    </div>
  )
}

function ShimmerBar({ width }) {
  return (
    <div
      style={{
        height: '14px',
        width,
        borderRadius: '2px',
        background: 'linear-gradient(90deg,#ede5d0,#f5eeda,#ede5d0)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }}
    />
  )
}
function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#fdf6ec',
            opacity: 0.9,
            animation: `bounce .9s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  )
}
