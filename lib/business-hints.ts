// Maps each business type to a "bucket" with category-appropriate example
// hints (jargon). Used for context-aware placeholders across forms.

export type HintSet = {
  itemName: string; // inventory product name placeholder
  itemCategory: string; // category placeholder
  saleExample: string; // sale description example
  expenseExample: string; // expense example
  producerExample: string; // producer/brand example
  unit: string; // default unit suggestion
};

const BUCKETS: Record<string, HintSet> = {
  provisions: {
    itemName: "e.g. Indomie carton, Peak milk",
    itemCategory: "e.g. Noodles, Dairy, Drinks",
    saleExample: "e.g. 3 cartons Indomie",
    expenseExample: "e.g. Restock from distributor",
    producerExample: "e.g. Dufil, FrieslandCampina",
    unit: "carton",
  },
  pharmacy: {
    itemName: "e.g. Paracetamol 500mg, Amoxil",
    itemCategory: "e.g. Analgesics, Antibiotics",
    saleExample: "e.g. 2 packs Paracetamol",
    expenseExample: "e.g. Drug restock from Emzor rep",
    producerExample: "e.g. Emzor, GSK, Fidson",
    unit: "pack",
  },
  electronics: {
    itemName: "e.g. iPhone charger, HDMI cable",
    itemCategory: "e.g. Accessories, Phones",
    saleExample: "e.g. 1 Samsung charger",
    expenseExample: "e.g. Stock from Computer Village",
    producerExample: "e.g. Samsung, Oraimo, Apple",
    unit: "pcs",
  },
  fashion: {
    itemName: "e.g. Ankara 6 yards, Senator material",
    itemCategory: "e.g. Fabrics, Ready-to-wear",
    saleExample: "e.g. 2 yards lace",
    expenseExample: "e.g. Buy fabric from Balogun market",
    producerExample: "e.g. Hitarget, ABC Wax",
    unit: "yards",
  },
  building: {
    itemName: "e.g. Dangote cement, 12mm rod",
    itemCategory: "e.g. Cement, Iron rods, Paint",
    saleExample: "e.g. 20 bags cement",
    expenseExample: "e.g. Truck of cement from depot",
    producerExample: "e.g. Dangote, BUA, Lafarge",
    unit: "bag",
  },
  food: {
    itemName: "e.g. Jollof rice plate, Bottle of Coke",
    itemCategory: "e.g. Main dishes, Drinks",
    saleExample: "e.g. 2 plates jollof + chicken",
    expenseExample: "e.g. Foodstuff for the kitchen",
    producerExample: "e.g. In-house, Coca-Cola",
    unit: "plate",
  },
  auto: {
    itemName: "e.g. Brake pad, Engine oil 5L",
    itemCategory: "e.g. Brakes, Lubricants, Filters",
    saleExample: "e.g. 1 set brake pads",
    expenseExample: "e.g. Parts from Ladipo market",
    producerExample: "e.g. Total, Mobil, Bosch",
    unit: "pcs",
  },
  cosmetics: {
    itemName: "e.g. Body lotion, Lipstick",
    itemCategory: "e.g. Skincare, Makeup, Perfume",
    saleExample: "e.g. 1 bottle body lotion",
    expenseExample: "e.g. Restock beauty supplies",
    producerExample: "e.g. Nivea, Maybelline, Zaron",
    unit: "pcs",
  },
  agriculture: {
    itemName: "e.g. Bag of maize, Day-old chicks",
    itemCategory: "e.g. Grains, Feeds, Livestock",
    saleExample: "e.g. 5 bags of maize",
    expenseExample: "e.g. Buy poultry feed",
    producerExample: "e.g. Olam, Top Feeds",
    unit: "bag",
  },
  services: {
    itemName: "e.g. Haircut, POS withdrawal fee",
    itemCategory: "e.g. Services, Charges",
    saleExample: "e.g. Withdrawal service charge",
    expenseExample: "e.g. Airtime/data float top-up",
    producerExample: "e.g. In-house",
    unit: "service",
  },
  general: {
    itemName: "e.g. Product name",
    itemCategory: "e.g. Category",
    saleExample: "e.g. Sold 2 items",
    expenseExample: "e.g. Fuel for generator",
    producerExample: "e.g. Brand / maker",
    unit: "pcs",
  },
};

// Keyword → bucket. First match wins (checked against the type string lowercased).
const RULES: { keywords: string[]; bucket: keyof typeof BUCKETS }[] = [
  { keywords: ["pharmac", "chemist", "medicine", "drug", "clinic", "hospital", "dental", "optical", "laborator", "herbal"], bucket: "pharmacy" },
  { keywords: ["phone", "computer", "laptop", "electronic", "appliance", "tech", "software", "cyber", "internet"], bucket: "electronics" },
  { keywords: ["boutique", "cloth", "tailor", "fashion", "fabric", "ankara", "shoe", "bag", "jewell"], bucket: "fashion" },
  { keywords: ["building", "hardware", "cement", "block", "paint", "plumb", "alumin", "furniture", "glass", "electrical material"], bucket: "building" },
  { keywords: ["spare", "mechanic", "car", "vulcaniz", "tyre", "motorcycle", "okada", "auto"], bucket: "auto" },
  { keywords: ["cosmetic", "beauty", "salon", "barbing", "spa", "makeup", "hair"], bucket: "cosmetics" },
  { keywords: ["poultry", "fish farm", "crop", "livestock", "agro", "farm", "feed", "veterinary", "agricultur"], bucket: "agriculture" },
  { keywords: ["restaurant", "bukka", "food", "fast food", "catering", "bar", "lounge", "hotel", "event", "water"], bucket: "food" },
  { keywords: ["pos", "agent banking", "bureau", "microfinance", "cooperative", "account", "legal", "real estate", "insurance", "consult", "laundry", "photo", "print", "school", "lesson", "training", "gym", "fitness", "security", "cleaning", "generator", "solar", "interior", "rental", "logistics", "dispatch", "transport", "haulage", "car wash"], bucket: "services" },
  { keywords: ["provision", "supermarket", "mini mart", "market", "foodstuff", "frozen", "drinks", "beverage", "bakery", "confection", "fruit", "vegetable", "meat", "butcher", "grain", "cereal", "wholesale", "distribut", "import", "merchandise", "online", "e-commerce", "dropship", "gift", "book", "stationery", "toy", "baby", "pet"], bucket: "provisions" },
];

export function bucketForType(type: string | undefined | null): keyof typeof BUCKETS {
  if (!type) return "general";
  const t = type.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule.bucket;
  }
  return "general";
}

export function hintsForType(type: string | undefined | null): HintSet {
  return BUCKETS[bucketForType(type)];
}
