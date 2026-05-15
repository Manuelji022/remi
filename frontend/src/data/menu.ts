import type { WeeklyMenu } from './types'
import type { Locale } from '#/i18n'

export const MENU_SETS: WeeklyMenu[] = [
  {
    Monday: {
      lunch: {
        name: 'Roasted Tomato Soup & Sourdough',
        description: 'Silky roast tomato soup served with toasted sourdough.',
      },
      dinner: {
        name: 'Herb-Crusted Salmon with Lentils',
        description: 'Baked salmon with herbs, warm lentils, and lemon.',
      },
    },
    Tuesday: {
      lunch: {
        name: 'Farro Salad with Roasted Squash',
        description: 'Nutty farro with roasted squash and sharp greens.',
      },
      dinner: {
        name: 'Slow-Braised Lamb with Gremolata',
        description: 'Tender lamb with citrus gremolata and pan juices.',
      },
    },
    Wednesday: {
      lunch: {
        name: 'Avocado Toast with Poached Egg',
        description: 'Crunchy toast topped with avocado and soft poached egg.',
      },
      dinner: {
        name: 'Wild Mushroom Risotto',
        description: 'Creamy risotto finished with mushrooms and parmesan.',
      },
    },
    Thursday: {
      lunch: {
        name: 'Chickpea & Spinach Stew',
        description: 'Comforting chickpea stew with spinach and warm spices.',
      },
      dinner: {
        name: 'Lemon Thyme Roast Chicken',
        description: 'Roast chicken with thyme, lemon, and golden edges.',
      },
    },
    Friday: {
      lunch: {
        name: 'Burrata with Heirloom Tomatoes',
        description: 'Creamy burrata with ripe tomatoes and olive oil.',
      },
      dinner: {
        name: 'Seared Tuna with Miso Glaze',
        description: 'Quick-seared tuna with a glossy miso finish.',
      },
    },
    Saturday: {
      lunch: {
        name: 'Leek & Potato Frittata',
        description: 'Soft-set frittata packed with leeks and potatoes.',
      },
      dinner: {
        name: 'Grilled Lamb Chops & Tabbouleh',
        description: 'Charred lamb chops with bright herb tabbouleh.',
      },
    },
    Sunday: {
      lunch: {
        name: 'Warm Lentil & Walnut Salad',
        description: 'Warm lentils, toasted walnuts, and a mustard dressing.',
      },
      dinner: {
        name: 'Slow-Roasted Pork with Apple Chutney',
        description:
          'Slow-cooked pork served with sweet-savoury apple chutney.',
      },
    },
  },
  {
    Monday: {
      lunch: {
        name: 'Miso Soup with Tofu & Wakame',
        description: 'Light miso broth with tofu, wakame, and spring onion.',
      },
      dinner: {
        name: 'Beef Short Rib with Polenta',
        description: 'Rich braised short rib over creamy polenta.',
      },
    },
    Tuesday: {
      lunch: {
        name: 'Smoked Salmon Bagel Board',
        description: 'Bagels with smoked salmon, herbs, and fresh toppings.',
      },
      dinner: {
        name: 'Vegetable Tagine with Couscous',
        description: 'Slow-simmered vegetables with warm spice and couscous.',
      },
    },
    Wednesday: {
      lunch: {
        name: 'Grilled Halloumi & Peach Salad',
        description: 'Salty halloumi paired with sweet peaches and greens.',
      },
      dinner: {
        name: 'Duck Breast with Cherry Reduction',
        description: 'Pan-seared duck finished with a glossy cherry sauce.',
      },
    },
    Thursday: {
      lunch: {
        name: 'White Bean & Kale Soup',
        description: 'Hearty white bean soup with kale and garlic.',
      },
      dinner: {
        name: 'Shrimp Scampi with Hand-Cut Pasta',
        description: 'Garlicky shrimp scampi tossed with fresh pasta.',
      },
    },
    Friday: {
      lunch: {
        name: 'Caprese Panini & Basil Oil',
        description: 'Pressed panini with mozzarella, tomato, and basil oil.',
      },
      dinner: {
        name: 'Braised Short Ribs & Celery Root',
        description: 'Slow-braised ribs with silky celery root on the side.',
      },
    },
    Saturday: {
      lunch: {
        name: 'Shakshuka with Feta & Dill',
        description: 'Eggs baked in tomato sauce with feta and dill.',
      },
      dinner: {
        name: 'Wood-Fired Pizza with Seasonal Veg',
        description: 'Crisp pizza topped with seasonal vegetables and herbs.',
      },
    },
    Sunday: {
      lunch: {
        name: 'Roasted Beet & Goat Cheese Bowl',
        description: 'Roasted beets, creamy goat cheese, and grains.',
      },
      dinner: {
        name: 'Whole Roasted Branzino with Herbs',
        description: 'Whole roasted fish with herbs, lemon, and olive oil.',
      },
    },
  },
  {
    Monday: {
      lunch: {
        name: 'Zucchini Fritters with Tzatziki',
        description: 'Crisp zucchini fritters served with cool tzatziki.',
      },
      dinner: {
        name: 'Stuffed Bell Peppers with Quinoa',
        description: 'Bell peppers filled with quinoa, herbs, and vegetables.',
      },
    },
    Tuesday: {
      lunch: {
        name: 'Pea & Mint Crostini',
        description: 'Toasted crostini with pea smash and fresh mint.',
      },
      dinner: {
        name: 'Pan-Seared Cod with Caponata',
        description: 'Seared cod served with sweet-sour caponata.',
      },
    },
    Wednesday: {
      lunch: {
        name: 'Warm Grain Bowl with Tahini Drizzle',
        description: 'Warm grains, greens, and tahini for a quick lunch.',
      },
      dinner: {
        name: 'Osso Buco with Saffron Risotto',
        description: 'Braised osso buco paired with saffron risotto.',
      },
    },
    Thursday: {
      lunch: {
        name: 'Gazpacho & Olive Oil Toast',
        description: 'Cold gazpacho with toast brushed in good olive oil.',
      },
      dinner: {
        name: 'Harissa Chicken Thighs & Yogurt',
        description: 'Harissa-roasted chicken with cooling yogurt.',
      },
    },
    Friday: {
      lunch: {
        name: 'Nicoise Salad with Anchovies',
        description: 'Bright salad with anchovies, olives, and soft potatoes.',
      },
      dinner: {
        name: 'Lobster Bisque with Crusty Bread',
        description: 'Velvety bisque with crusty bread for dipping.',
      },
    },
    Saturday: {
      lunch: {
        name: 'Mushroom & Brie Toastie',
        description: 'Buttery toastie with mushrooms and melting brie.',
      },
      dinner: {
        name: 'Slow-Cooked Oxtail with Root Veg',
        description: 'Rich oxtail braise with deep flavour and root veg.',
      },
    },
    Sunday: {
      lunch: {
        name: 'Spring Pea Soup & Sourdough',
        description: 'Fresh pea soup with sourdough on the side.',
      },
      dinner: {
        name: 'Rack of Lamb with Rosemary Jus',
        description: 'Roast lamb finished with a rosemary jus.',
      },
    },
  },
]

const SPANISH_MENU_SETS: WeeklyMenu[] = [
  {
    Monday: {
      lunch: {
        name: 'Sopa de tomate asado y masa madre',
        description:
          'Sopa sedosa de tomate asado servida con masa madre tostada.',
      },
      dinner: {
        name: 'Salmón con costra de hierbas y lentejas',
        description: 'Salmón al horno con hierbas, lentejas templadas y limón.',
      },
    },
    Tuesday: {
      lunch: {
        name: 'Ensalada de farro con calabaza asada',
        description: 'Farro con calabaza asada y hojas verdes intensas.',
      },
      dinner: {
        name: 'Cordero braseado lentamente con gremolata',
        description: 'Cordero tierno con gremolata cítrica y jugos de cocción.',
      },
    },
    Wednesday: {
      lunch: {
        name: 'Tostada de aguacate con huevo pochado',
        description:
          'Tostada crujiente con aguacate y huevo pochado suave.',
      },
      dinner: {
        name: 'Risotto de setas silvestres',
        description: 'Risotto cremoso terminado con setas y parmesano.',
      },
    },
    Thursday: {
      lunch: {
        name: 'Guiso de garbanzos y espinacas',
        description:
          'Guiso reconfortante de garbanzos con espinacas y especias cálidas.',
      },
      dinner: {
        name: 'Pollo asado con limón y tomillo',
        description: 'Pollo asado con tomillo, limón y bordes dorados.',
      },
    },
    Friday: {
      lunch: {
        name: 'Burrata con tomates heirloom',
        description: 'Burrata cremosa con tomates maduros y aceite de oliva.',
      },
      dinner: {
        name: 'Atún marcado con glaseado de miso',
        description: 'Atún sellado rápidamente con acabado brillante de miso.',
      },
    },
    Saturday: {
      lunch: {
        name: 'Frittata de puerro y patata',
        description: 'Frittata suave llena de puerros y patatas.',
      },
      dinner: {
        name: 'Chuletas de cordero a la parrilla con tabulé',
        description: 'Chuletas marcadas con tabulé fresco de hierbas.',
      },
    },
    Sunday: {
      lunch: {
        name: 'Ensalada templada de lentejas y nueces',
        description:
          'Lentejas templadas, nueces tostadas y aliño de mostaza.',
      },
      dinner: {
        name: 'Cerdo asado lentamente con chutney de manzana',
        description:
          'Cerdo cocinado a fuego lento con chutney de manzana dulce y salado.',
      },
    },
  },
  {
    Monday: {
      lunch: {
        name: 'Sopa de miso con tofu y wakame',
        description: 'Caldo ligero de miso con tofu, wakame y cebolleta.',
      },
      dinner: {
        name: 'Costilla corta de ternera con polenta',
        description: 'Costilla braseada intensa sobre polenta cremosa.',
      },
    },
    Tuesday: {
      lunch: {
        name: 'Tabla de bagels con salmón ahumado',
        description: 'Bagels con salmón ahumado, hierbas y toppings frescos.',
      },
      dinner: {
        name: 'Tajín de verduras con cuscús',
        description: 'Verduras cocinadas lentamente con especias y cuscús.',
      },
    },
    Wednesday: {
      lunch: {
        name: 'Ensalada de halloumi a la parrilla y melocotón',
        description:
          'Halloumi salado con melocotones dulces y hojas verdes.',
      },
      dinner: {
        name: 'Pechuga de pato con reducción de cereza',
        description: 'Pato marcado en sartén con salsa brillante de cereza.',
      },
    },
    Thursday: {
      lunch: {
        name: 'Sopa de alubias blancas y kale',
        description: 'Sopa contundente de alubias con kale y ajo.',
      },
      dinner: {
        name: 'Gambas al ajillo con pasta fresca',
        description: 'Gambas al ajillo mezcladas con pasta recién cortada.',
      },
    },
    Friday: {
      lunch: {
        name: 'Panini caprese con aceite de albahaca',
        description: 'Panini prensado con mozzarella, tomate y albahaca.',
      },
      dinner: {
        name: 'Costillas braseadas con apionabo',
        description: 'Costillas lentas con apionabo sedoso como guarnición.',
      },
    },
    Saturday: {
      lunch: {
        name: 'Shakshuka con feta y eneldo',
        description: 'Huevos horneados en salsa de tomate con feta y eneldo.',
      },
      dinner: {
        name: 'Pizza al horno de leña con verduras de temporada',
        description: 'Pizza crujiente con verduras de temporada y hierbas.',
      },
    },
    Sunday: {
      lunch: {
        name: 'Bol de remolacha asada y queso de cabra',
        description: 'Remolacha asada, queso de cabra cremoso y cereales.',
      },
      dinner: {
        name: 'Branzino entero asado con hierbas',
        description: 'Pescado entero asado con hierbas, limón y aceite.',
      },
    },
  },
  {
    Monday: {
      lunch: {
        name: 'Tortitas de calabacín con tzatziki',
        description: 'Tortitas crujientes de calabacín con tzatziki fresco.',
      },
      dinner: {
        name: 'Pimientos rellenos de quinoa',
        description: 'Pimientos rellenos de quinoa, hierbas y verduras.',
      },
    },
    Tuesday: {
      lunch: {
        name: 'Crostini de guisantes y menta',
        description: 'Crostini tostado con crema de guisantes y menta fresca.',
      },
      dinner: {
        name: 'Bacalao marcado con caponata',
        description: 'Bacalao dorado servido con caponata agridulce.',
      },
    },
    Wednesday: {
      lunch: {
        name: 'Bol templado de cereales con tahini',
        description: 'Cereales templados, hojas verdes y tahini para una comida rápida.',
      },
      dinner: {
        name: 'Ossobuco con risotto de azafrán',
        description: 'Ossobuco braseado acompañado de risotto de azafrán.',
      },
    },
    Thursday: {
      lunch: {
        name: 'Gazpacho y tostada con aceite de oliva',
        description: 'Gazpacho frío con tostada untada en buen aceite.',
      },
      dinner: {
        name: 'Muslos de pollo con harissa y yogur',
        description: 'Pollo asado con harissa y yogur refrescante.',
      },
    },
    Friday: {
      lunch: {
        name: 'Ensalada niçoise con anchoas',
        description: 'Ensalada viva con anchoas, aceitunas y patatas suaves.',
      },
      dinner: {
        name: 'Bisque de bogavante con pan crujiente',
        description: 'Bisque aterciopelada con pan para mojar.',
      },
    },
    Saturday: {
      lunch: {
        name: 'Tostie de setas y brie',
        description: 'Sándwich tostado con setas y brie fundente.',
      },
      dinner: {
        name: 'Rabo de toro lento con verduras de raíz',
        description: 'Braseado intenso de rabo con sabor profundo y verduras.',
      },
    },
    Sunday: {
      lunch: {
        name: 'Sopa de guisantes tiernos y masa madre',
        description: 'Sopa fresca de guisantes con masa madre al lado.',
      },
      dinner: {
        name: 'Carré de cordero con jugo de romero',
        description: 'Cordero asado terminado con jugo de romero.',
      },
    },
  },
]

export function getMenuSets(locale: Locale): WeeklyMenu[] {
  return locale === 'es' ? SPANISH_MENU_SETS : MENU_SETS
}
