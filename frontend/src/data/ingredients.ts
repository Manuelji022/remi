import type { ChecklistState } from './types'

export const CATEGORY_META = {
  produceAndFreshHerbs: {
    label: 'Produce & Fresh Herbs',
    accent: '#7b9460',
    bg: 'rgba(123,148,96,.08)',
    border: 'rgba(123,148,96,.2)',
  },
  meatAndFish: {
    label: 'Meat & Fish',
    accent: '#b5713a',
    bg: 'rgba(181,113,58,.08)',
    border: 'rgba(181,113,58,.2)',
  },
  dairyAndEggs: {
    label: 'Dairy & Eggs',
    accent: '#c9a060',
    bg: 'rgba(201,160,96,.08)',
    border: 'rgba(201,160,96,.2)',
  },
  pantryAndDryGoods: {
    label: 'Pantry & Dry Goods',
    accent: '#8a7060',
    bg: 'rgba(138,112,96,.07)',
    border: 'rgba(138,112,96,.18)',
  },
  condimentsAndSauces: {
    label: 'Condiments & Sauces',
    accent: '#9a6880',
    bg: 'rgba(154,104,128,.07)',
    border: 'rgba(154,104,128,.18)',
  },
} as const

export type IngredientCategory = keyof typeof CATEGORY_META

export interface Ingredient {
  name: string
  qty: string
}

export type IngredientSet = Record<IngredientCategory, Ingredient[]>

export function getIngredientChecklistKey(
  category: IngredientCategory,
  ingredientName: string,
): string {
  return `${category}::${ingredientName}`
}

export const INGREDIENT_SETS: IngredientSet[] = [
  {
    produceAndFreshHerbs: [
      { name: 'Cherry tomatoes', qty: '500g' },
      { name: 'Fresh sourdough loaf', qty: '1' },
      { name: 'Butternut squash', qty: '1 large' },
      { name: 'Farro', qty: '200g' },
      { name: 'Avocados', qty: '2' },
      { name: 'Eggs', qty: '6' },
      { name: 'Wild mushrooms', qty: '400g' },
      { name: 'Arborio rice', qty: '300g' },
      { name: 'Chickpeas, dried', qty: '200g' },
      { name: 'Fresh spinach', qty: '300g' },
      { name: 'Heirloom tomatoes', qty: '4' },
      { name: 'Fresh thyme', qty: '1 bunch' },
      { name: 'Leeks', qty: '3' },
      { name: 'Potatoes', qty: '600g' },
      { name: 'Lentils, green', qty: '250g' },
      { name: 'Walnuts', qty: '100g' },
      { name: 'Fresh rosemary', qty: '1 bunch' },
      { name: 'Fresh parsley', qty: '1 bunch' },
      { name: 'Garlic', qty: '2 heads' },
      { name: 'Shallots', qty: '6' },
    ],
    meatAndFish: [
      { name: 'Salmon fillets', qty: '4 x 180g' },
      { name: 'Lamb shoulder', qty: '1.2kg' },
      { name: 'Whole chicken', qty: '1.8kg' },
      { name: 'Tuna steaks', qty: '2 x 200g' },
      { name: 'Lamb chops', qty: '8' },
      { name: 'Pork shoulder', qty: '1.5kg' },
    ],
    dairyAndEggs: [
      { name: 'Burrata', qty: '2 balls' },
      { name: 'Parmesan', qty: '150g' },
      { name: 'Unsalted butter', qty: '250g' },
      { name: 'Creme fraiche', qty: '200ml' },
      { name: 'Free-range eggs', qty: '12' },
      { name: 'Pecorino', qty: '80g' },
    ],
    pantryAndDryGoods: [
      { name: 'Lentils, Puy', qty: '300g' },
      { name: 'Olive oil, extra virgin', qty: '1L' },
      { name: 'Dijon mustard', qty: '1 jar' },
      { name: 'Miso paste', qty: '150g' },
      { name: 'Arborio rice', qty: '500g' },
      { name: 'Vegetable stock', qty: '2L' },
      { name: 'Canned San Marzano tomatoes', qty: '2 tins' },
      { name: 'Dried chilli flakes', qty: '1 jar' },
      { name: 'Sea salt flakes', qty: '1 box' },
      { name: 'Black pepper, whole', qty: '1 bag' },
      { name: 'Bay leaves', qty: '1 pack' },
      { name: 'Apple cider vinegar', qty: '1 bottle' },
    ],
    condimentsAndSauces: [
      { name: 'Soy sauce, low sodium', qty: '1 bottle' },
      { name: 'Tahini', qty: '200g' },
      { name: 'Capers', qty: '1 jar' },
      { name: 'Preserved lemons', qty: '1 jar' },
      { name: 'Harissa paste', qty: '1 jar' },
    ],
  },
  {
    produceAndFreshHerbs: [
      { name: 'Firm tofu', qty: '400g' },
      { name: 'Wakame seaweed, dried', qty: '1 pack' },
      { name: 'Peaches', qty: '4' },
      { name: 'Kale', qty: '400g' },
      { name: 'White beans, dried', qty: '200g' },
      { name: 'Celery root', qty: '1 large' },
      { name: 'Beets', qty: '4 medium' },
      { name: 'Seasonal vegetables mix', qty: '1kg' },
      { name: 'Fresh dill', qty: '1 bunch' },
      { name: 'Fresh basil', qty: '1 bunch' },
      { name: 'Garlic', qty: '2 heads' },
      { name: 'Spring onions', qty: '1 bunch' },
      { name: 'Lemons', qty: '4' },
      { name: 'Cherry tomatoes', qty: '400g' },
    ],
    meatAndFish: [
      { name: 'Beef short rib', qty: '1.2kg' },
      { name: 'Smoked salmon', qty: '200g' },
      { name: 'Duck breasts', qty: '2' },
      { name: 'Shrimp, raw', qty: '500g' },
      { name: 'Braising short ribs', qty: '800g' },
      { name: 'Whole branzino', qty: '1.2kg' },
    ],
    dairyAndEggs: [
      { name: 'Halloumi', qty: '250g' },
      { name: 'Goat cheese', qty: '150g' },
      { name: 'Feta', qty: '200g' },
      { name: 'Mascarpone', qty: '200g' },
      { name: 'Eggs', qty: '8' },
      { name: 'Full-fat milk', qty: '500ml' },
    ],
    pantryAndDryGoods: [
      { name: 'Bagels', qty: '4' },
      { name: 'Couscous', qty: '300g' },
      { name: 'Hand-cut pasta', qty: '400g' },
      { name: 'Polenta', qty: '300g' },
      { name: 'Olive oil, extra virgin', qty: '1L' },
      { name: 'Chicken stock', qty: '1.5L' },
      { name: 'Canned chickpeas', qty: '2 tins' },
      { name: 'Ras el hanout spice mix', qty: '1 jar' },
      { name: 'Smoked paprika', qty: '1 jar' },
      { name: 'Cumin seeds', qty: '1 jar' },
      { name: 'Coriander seeds', qty: '1 jar' },
      { name: 'Dried oregano', qty: '1 jar' },
    ],
    condimentsAndSauces: [
      { name: 'Cherry jam', qty: '1 jar' },
      { name: 'Basil oil', qty: '1 bottle' },
      { name: 'Caperberries', qty: '1 jar' },
      { name: 'White wine', qty: '1 bottle' },
      { name: 'Pomegranate molasses', qty: '1 bottle' },
    ],
  },
  {
    produceAndFreshHerbs: [
      { name: 'Zucchini', qty: '4 medium' },
      { name: 'Bell peppers, mixed', qty: '6' },
      { name: 'Peas, fresh or frozen', qty: '400g' },
      { name: 'Fresh mint', qty: '1 bunch' },
      { name: 'Cauliflower', qty: '1 head' },
      { name: 'Mushrooms', qty: '500g' },
      { name: 'Spring peas', qty: '300g' },
      { name: 'Garlic', qty: '2 heads' },
      { name: 'Onions', qty: '4' },
      { name: 'Celery', qty: '1 bunch' },
      { name: 'Carrots', qty: '4' },
      { name: 'Lemons', qty: '5' },
      { name: 'Cucumber', qty: '2' },
      { name: 'Ripe tomatoes', qty: '1kg' },
      { name: 'Fresh tarragon', qty: '1 bunch' },
    ],
    meatAndFish: [
      { name: 'Cod fillets', qty: '4 x 160g' },
      { name: 'Veal osso buco', qty: '4 pieces' },
      { name: 'Chicken thighs', qty: '8' },
      { name: 'Lobster bisque base', qty: '1 tin' },
      { name: 'Oxtail', qty: '1.5kg' },
      { name: 'Rack of lamb', qty: '1 full rack' },
    ],
    dairyAndEggs: [
      { name: 'Greek yoghurt', qty: '500g' },
      { name: 'Brie', qty: '200g' },
      { name: 'Eggs', qty: '10' },
      { name: 'Unsalted butter', qty: '200g' },
      { name: 'Cream', qty: '300ml' },
      { name: 'Pecorino romano', qty: '100g' },
    ],
    pantryAndDryGoods: [
      { name: 'Quinoa', qty: '300g' },
      { name: 'Saffron', qty: '1 small pinch' },
      { name: 'Arborio rice', qty: '400g' },
      { name: 'Sourdough bread', qty: '1 loaf' },
      { name: 'Olive oil, extra virgin', qty: '1L' },
      { name: 'Anchovies', qty: '1 tin' },
      { name: 'Caponata', qty: '1 jar' },
      { name: 'Harissa', qty: '1 jar' },
      { name: 'Tahini', qty: '150g' },
      { name: 'Crusty bread', qty: '1 loaf' },
      { name: 'Lamb stock', qty: '1L' },
      { name: 'Veal stock', qty: '1L' },
    ],
    condimentsAndSauces: [
      { name: 'Tzatziki', qty: '1 tub' },
      { name: 'Rosemary jus base', qty: '1 jar' },
      { name: 'Nicoise olives', qty: '100g' },
      { name: 'Sun-dried tomatoes', qty: '100g' },
      { name: 'Red wine vinegar', qty: '1 bottle' },
    ],
  },
]

export function createChecklistState(
  ingredientSet: IngredientSet,
): ChecklistState {
  return (
    Object.keys(ingredientSet) as IngredientCategory[]
  ).reduce<ChecklistState>((checklist, category) => {
    ingredientSet[category].forEach((ingredient) => {
      checklist[getIngredientChecklistKey(category, ingredient.name)] = {
        checked: false,
        inFridge: false,
      }
    })

    return checklist
  }, {})
}

export function getNeededItemsCount(checklist: ChecklistState): number {
  return Object.values(checklist).filter(
    (item) => !item.checked && !item.inFridge,
  ).length
}
