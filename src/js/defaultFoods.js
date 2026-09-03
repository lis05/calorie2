export const defaultFoods = [
  {
    name_uk: "Вівсяна каша на воді",
    name_en: "Oatmeal on water",
    name: "Вівсяна каша на воді",
    calories: 68, protein: 2.4, carbs: 12, fats: 1.4, fiber: 1.7, salt: 0.12, sugar: 0.3
  },
  {
    name_uk: "Гречана каша варена",
    name_en: "Boiled buckwheat",
    name: "Гречана каша варена",
    calories: 92, protein: 3.4, carbs: 20, fats: 0.6, fiber: 2.7, salt: 0.01, sugar: 0.2
  },
  {
    name_uk: "Білий рис варений",
    name_en: "Boiled white rice",
    name: "Білий рис варений",
    calories: 130, protein: 2.7, carbs: 28.2, fats: 0.3, fiber: 0.4, salt: 0.01, sugar: 0.1
  },
  {
    name_uk: "Картопля варена",
    name_en: "Boiled potatoes",
    name: "Картопля варена",
    calories: 87, protein: 1.9, carbs: 20, fats: 0.1, fiber: 1.8, salt: 0.02, sugar: 0.9
  },
  {
    name_uk: "Куряче філе відварене",
    name_en: "Boiled chicken breast",
    name: "Куряче філе відварене",
    calories: 165, protein: 31, carbs: 0, fats: 3.6, fiber: 0, salt: 0.19, sugar: 0
  },
  {
    name_uk: "Яйце куряче варене (1 шт ~50г)",
    name_en: "Boiled chicken egg (1 pc ~50g)",
    name: "Яйце куряче варене (1 шт ~50г)",
    calories: 143, protein: 12.6, carbs: 0.7, fats: 9.5, fiber: 0, salt: 0.31, sugar: 0.4
  },
  {
    name_uk: "Сир кисломолочний 5%",
    name_en: "Cottage cheese 5%",
    name: "Сир кисломолочний 5%",
    calories: 121, protein: 17, carbs: 3, fats: 5, fiber: 0, salt: 0.10, sugar: 3
  },
  {
    name_uk: "Банан свіжий",
    name_en: "Fresh banana",
    name: "Банан свіжий",
    calories: 89, protein: 1.1, carbs: 23, fats: 0.3, fiber: 2.6, salt: 0.01, sugar: 12
  },
  {
    name_uk: "Яблуко свіже",
    name_en: "Fresh apple",
    name: "Яблуко свіже",
    calories: 52, protein: 0.3, carbs: 14, fats: 0.2, fiber: 2.4, salt: 0.01, sugar: 10
  },
  {
    name_uk: "Огірок свіжий",
    name_en: "Fresh cucumber",
    name: "Огірок свіжий",
    calories: 15, protein: 0.7, carbs: 3.6, fats: 0.1, fiber: 0.5, salt: 0.01, sugar: 1.7
  },
  {
    name_uk: "Помідор свіжий",
    name_en: "Fresh tomato",
    name: "Помідор свіжий",
    calories: 18, protein: 0.9, carbs: 3.9, fats: 0.2, fiber: 1.2, salt: 0.02, sugar: 2.6
  },
  {
    name_uk: "Хліб житній",
    name_en: "Rye bread",
    name: "Хліб житній",
    calories: 259, protein: 8.5, carbs: 48, fats: 3.3, fiber: 5.8, salt: 1.25, sugar: 1.5
  },
  {
    name_uk: "Олія соняшникова / оливкова",
    name_en: "Sunflower / olive oil",
    name: "Олія соняшникова / оливкова",
    calories: 884, protein: 0, carbs: 0, fats: 100, fiber: 0, salt: 0, sugar: 0
  },
  {
    name_uk: "Вершкове масло 82%",
    name_en: "Butter 82%",
    name: "Вершкове масло 82%",
    calories: 748, protein: 0.8, carbs: 0.8, fats: 82.5, fiber: 0, salt: 0.03, sugar: 0.8
  },
  {
    name_uk: "Волоський горіх",
    name_en: "Walnut",
    name: "Волоський горіх",
    calories: 654, protein: 15.2, carbs: 13.7, fats: 65.2, fiber: 6.7, salt: 0.01, sugar: 2.6
  }
];

export const foodTranslations = {
  "Вівсяна каша на воді": "Oatmeal on water",
  "Гречана каша варена": "Boiled buckwheat",
  "Білий рис варений": "Boiled white rice",
  "Картопля варена": "Boiled potatoes",
  "Куряче філе відварене": "Boiled chicken breast",
  "Яйце куряче варене (1 шт ~50г)": "Boiled chicken egg (1 pc ~50g)",
  "Сир кисломолочний 5%": "Cottage cheese 5%",
  "Банан свіжий": "Fresh banana",
  "Яблуко свіже": "Fresh apple",
  "Огірок свіжий": "Fresh cucumber",
  "Помідор свіжий": "Fresh tomato",
  "Хліб житній": "Rye bread",
  "Олія соняшникова / оливкова": "Sunflower / olive oil",
  "Вершкове масло 82%": "Butter 82%",
  "Волоський горіх": "Walnut"
};

// Reverse map for English -> Ukrainian
export const reverseTranslations = Object.fromEntries(
  Object.entries(foodTranslations).map(([uk, en]) => [en, uk])
);

export function getFoodDisplayName(food, lang = 'uk') {
  if (!food) return '';
  if (typeof food === 'string') {
    if (lang === 'en') return foodTranslations[food] || food;
    return reverseTranslations[food] || food;
  }
  if (lang === 'en') {
    return food.name_en || foodTranslations[food.name_uk] || foodTranslations[food.name] || food.name || '';
  }
  return food.name_uk || reverseTranslations[food.name_en] || reverseTranslations[food.name] || food.name || '';
}
