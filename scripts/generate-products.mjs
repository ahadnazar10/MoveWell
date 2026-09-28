// Generates src/data/products.json — see docs/specs.md §4.1 for the dataset rules.
// Run with: node scripts/generate-products.mjs
import { writeFileSync } from "node:fs";

const CATEGORIES = {
  Cricket: {
    brands: ["StrikeZone", "PowerPlay"],
    items: [
      ["English Willow Cricket Bat", "A grade", { Material: "English willow", weight: "1180g", "suitable for": "Leather ball", "skill level": "Intermediate", warranty: "6 months" }],
      ["Kashmir Willow Cricket Bat", "Youth size", { Material: "Kashmir willow", weight: "1050g", "suitable for": "Tennis ball", "skill level": "Beginner", warranty: "3 months" }],
      ["Cricket Batting Pads (Pair)", "Lightweight", { Material: "High-density foam, PU", size: "Men's", "suitable for": "Leather ball", warranty: "1 year" }],
      ["Cricket Batting Gloves", "Extra padding on knuckles", { Material: "Leather palm, foam back", size: "Men's L", "skill level": "Intermediate", warranty: "6 months" }],
      ["Cricket Helmet with Grille", "Steel grille, adjustable", { Material: "ABS shell", size: "M/L", "suitable for": "Leather ball", warranty: "1 year" }],
      ["Leather Cricket Ball (Pack of 6)", "Match quality, red", { Material: "Genuine leather", weight: "156g", "suitable for": "Leather ball", warranty: "No warranty" }],
      ["Cricket Kit Bag", "Wheeled, 3 compartments", { Material: "600D polyester", size: '34"', warranty: "1 year" }],
      ["Cricket Stumps Set", "Wooden, with bails", { Material: "Seasoned wood", size: "Standard", warranty: "No warranty" }],
      ["Cricket Wicket Keeping Gloves", "Extra grip palm", { Material: "Pittard leather", size: "Men's", "skill level": "Advanced", warranty: "6 months" }],
      ["Cricket Abdominal Guard", "Ventilated", { Material: "PE shell, foam lining", size: "Men's", warranty: "3 months" }],
    ],
  },
  Football: {
    brands: ["StrikeZone", "PowerPlay"],
    items: [
      ["Match Football Size 5", "FIFA quality pro", { Material: "PU synthetic", size: "5", "suitable for": "Firm ground", warranty: "6 months" }],
      ["Training Football Size 4", "Youth training ball", { Material: "TPU", size: "4", "skill level": "Beginner", warranty: "3 months" }],
      ["Football Studs (Firm Ground)", "Conical studs", { Material: "Synthetic leather upper", size: "UK 8", "suitable for": "Firm ground", warranty: "6 months" }],
      ["Football Shin Guards", "Slip-in with ankle sleeve", { Material: "EVA foam, PP shell", size: "M", warranty: "3 months" }],
      ["Goalkeeper Gloves", "Latex palm, finger spines", { Material: "Latex, neoprene", size: "9", "skill level": "Intermediate", warranty: "3 months" }],
      ["Football Training Cones (Set of 20)", "Stackable, bright colours", { Material: "PVC", size: "9 inch", warranty: "No warranty" }],
      ["Portable Football Goal Post", "Pop-up, carry bag included", { Material: "Fibreglass frame", size: "6x3 ft", warranty: "6 months" }],
      ["Football Captain's Armband", "Elastic, one size", { Material: "Elastane", size: "One size", warranty: "No warranty" }],
      ["Agility Ladder", "12 rungs, adjustable", { Material: "Nylon webbing", size: "4m", "suitable for": "Speed training", warranty: "No warranty" }],
      ["Football Pump with Needles", "Dual action", { Material: "ABS plastic", warranty: "3 months" }],
    ],
  },
  Badminton: {
    brands: ["AceShuttle", "FlexFit"],
    items: [
      ["Carbon Fibre Badminton Racket", "Full graphite, medium flex", { Material: "Full graphite", weight: "85g", "skill level": "Intermediate", warranty: "6 months" }],
      ["Aluminium Badminton Racket", "Beginner friendly", { Material: "Aluminium/steel", weight: "95g", "skill level": "Beginner", warranty: "3 months" }],
      ["Feather Shuttlecocks (Tube of 12)", "Goose feather, tournament grade", { Material: "Goose feather, cork", "skill level": "Advanced", warranty: "No warranty" }],
      ["Nylon Shuttlecocks (Tube of 6)", "Practice grade", { Material: "Nylon, cork", "skill level": "Beginner", warranty: "No warranty" }],
      ["Badminton Racket Cover Bag", "Padded, holds 2 rackets", { Material: "Polyester", warranty: "3 months" }],
      ["Badminton Court Shoes", "Non-marking sole", { Material: "Mesh upper, rubber sole", size: "UK 9", "suitable for": "Indoor court", warranty: "6 months" }],
      ["Badminton Grip Tape (Pack of 3)", "Anti-slip overgrip", { Material: "PU", warranty: "No warranty" }],
      ["Badminton Net with Poles", "Regulation size", { Material: "Nylon net, steel poles", size: "6.1m", warranty: "6 months" }],
      ["Badminton Wristband", "Sweat absorbing, pair", { Material: "Cotton terry", size: "Free size", warranty: "No warranty" }],
      ["Junior Badminton Racket Set (2 Player)", "With shuttlecocks", { Material: "Aluminium", "skill level": "Beginner", warranty: "3 months" }],
    ],
  },
  "Gym equipment": {
    brands: ["IronCore", "FlexFit"],
    items: [
      ["Adjustable Dumbbell Set (20kg)", "Pair, plate-loaded", { Material: "Cast iron, rubber coating", weight: "20kg total", "skill level": "Intermediate", warranty: "1 year" }],
      ["Olympic Barbell 5ft", "Knurled grip", { Material: "Steel, chrome finish", weight: "10kg", "suitable for": "Home gym", warranty: "1 year" }],
      ["Foldable Weight Bench", "Adjustable incline", { Material: "Steel frame, PU pad", weight: "12kg", warranty: "1 year" }],
      ["Resistance Bands Set (5 Levels)", "With door anchor", { Material: "Natural latex", warranty: "3 months" }],
      ["Kettlebell 12kg", "Cast iron, vinyl coated", { Material: "Cast iron", weight: "12kg", "skill level": "Intermediate", warranty: "6 months" }],
      ["Skipping Rope with Ball Bearings", "Adjustable length", { Material: "Steel cable, foam handle", warranty: "3 months" }],
      ["Push Up Bars (Pair)", "Non-slip foam grip", { Material: "Steel, foam", weight: "1.2kg", warranty: "6 months" }],
      ["Yoga and Gym Mat 10mm", "Extra cushioning", { Material: "NBR foam", size: "183x61cm", warranty: "3 months" }],
      ["Ab Roller Wheel", "Dual wheel, knee pad included", { Material: "PP plastic, rubber", warranty: "3 months" }],
      ["Home Gym Pull-Up Bar", "Doorway mounted", { Material: "Steel", "suitable for": "Home gym", warranty: "6 months" }],
      ["Weight Plates Set (10kg x 2)", "Rubber coated", { Material: "Cast iron, rubber", weight: "20kg total", warranty: "1 year" }],
      ["Gym Gloves with Wrist Support", "Breathable mesh back", { Material: "Leather palm", size: "L", warranty: "3 months" }],
    ],
  },
  Yoga: {
    brands: ["ZenMat", "FlexFit"],
    items: [
      ["Premium Yoga Mat 6mm", "Non-slip, eco TPE", { Material: "TPE", size: "183x61cm", "skill level": "Beginner", warranty: "6 months" }],
      ["Cork Yoga Mat 4mm", "Natural cork surface", { Material: "Cork, rubber base", size: "183x66cm", warranty: "6 months" }],
      ["Yoga Block Set (2 Pack)", "High-density foam", { Material: "EVA foam", size: "23x15x7.5cm", warranty: "No warranty" }],
      ["Yoga Strap 8ft", "D-ring buckle", { Material: "Cotton webbing", size: "8ft", warranty: "No warranty" }],
      ["Meditation Cushion", "Buckwheat filled", { Material: "Cotton cover, buckwheat hulls", size: "33cm diameter", warranty: "No warranty" }],
      ["Yoga Wheel", "Back stretch prop", { Material: "ABS core, TPE padding", size: "32cm diameter", "skill level": "Intermediate", warranty: "3 months" }],
      ["Yoga Bolster Pillow", "Rectangular, firm support", { Material: "Cotton cover, cotton fill", size: "65x23x13cm", warranty: "No warranty" }],
      ["Aromatherapy Yoga Mat Spray", "Lavender scent, 100ml", { Material: "Natural essential oils", warranty: "No warranty" }],
      ["Yoga Mat Carry Bag", "Adjustable strap", { Material: "Cotton canvas", warranty: "No warranty" }],
      ["Foam Roller for Yoga", "Muscle recovery", { Material: "EPP foam", size: "45cm", "skill level": "Intermediate", warranty: "3 months" }],
    ],
  },
  Activewear: {
    brands: ["FlexFit", "PowerPlay"],
    items: [
      ["Men's Dry-Fit Training T-Shirt", "Moisture wicking", { Material: "Polyester blend", size: "L", "suitable for": "Gym, running", warranty: "No warranty" }],
      ["Women's High-Waist Leggings", "Squat proof", { Material: "Nylon-spandex", size: "M", "suitable for": "Yoga, gym", warranty: "No warranty" }],
      ["Men's Running Shorts", "Built-in liner, zip pocket", { Material: "Polyester", size: "L", "suitable for": "Running", warranty: "No warranty" }],
      ["Women's Sports Bra", "Medium impact, racerback", { Material: "Nylon-spandex", size: "M", "suitable for": "Yoga, gym", warranty: "No warranty" }],
      ["Men's Track Jacket", "Full zip, breathable", { Material: "Polyester", size: "XL", "suitable for": "Running, outdoor", warranty: "No warranty" }],
      ["Compression Base Layer Top", "Long sleeve", { Material: "Spandex blend", size: "M", "suitable for": "Cricket, football", warranty: "No warranty" }],
      ["Unisex Ankle Socks (3 Pack)", "Cushioned sole", { Material: "Cotton-spandex", size: "Free size", warranty: "No warranty" }],
      ["Men's Gym Tank Top", "Muscle fit, drop armhole", { Material: "Cotton blend", size: "M", "suitable for": "Gym", warranty: "No warranty" }],
      ["Women's Zip-Up Hoodie", "Fleece lined", { Material: "Cotton-polyester", size: "S", "suitable for": "Outdoor, casual", warranty: "No warranty" }],
      ["Sports Cap", "Adjustable strap, UV protection", { Material: "Cotton twill", size: "Free size", "suitable for": "Running, cricket", warranty: "No warranty" }],
    ],
  },
};

function svgPlaceholder(category, tag) {
  const palette = {
    Cricket: "#1f8a50",
    Football: "#2d5df0",
    Badminton: "#c4432b",
    "Gym equipment": "#12171b",
    Yoga: "#9a6b06",
    Activewear: "#7a3fc4",
  };
  const color = palette[category] ?? "#5b646b";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${category}</text><text x="50%" y="88%" font-family="sans-serif" font-size="14" fill="#ffffff" opacity="0.7" text-anchor="middle">#${tag}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

let id = 1;
const products = [];

for (const [category, { brands, items }] of Object.entries(CATEGORIES)) {
  items.forEach(([title, note, specs], i) => {
    const brand = brands[i % brands.length];
    const basePrice = 299 + ((id * 137) % 4800) + 0.5; // paise-friendly, varied
    const price = Math.round(basePrice * 100) / 100;

    // Deliberately messy fields — see docs/specs.md §4.1
    const outOfStock = id % 11 === 0;
    const zeroDiscount = id % 7 === 0;
    const omitDiscount = id % 13 === 0;
    const brokenImage = id % 17 === 0;
    const veryLongTitle = id === 5;

    const product = {
      id,
      title: veryLongTitle
        ? `${title} — ${note} — Officially Licensed Tournament Edition with Extended Grip Comfort Technology and 12-Month Manufacturer Warranty (Limited Stock)`
        : title,
      description: `${note}. Built for ${category.toLowerCase()} players who want reliable gear without the guesswork — true to size, tested for everyday training and match use.`,
      category,
      brand,
      price,
      rating: Math.round((3.2 + ((id * 53) % 18) / 10) * 10) / 10,
      stock: outOfStock ? 0 : 3 + ((id * 29) % 40),
      specs,
      thumbnail: brokenImage ? "/images/missing-product.jpg" : svgPlaceholder(category, id),
      images: brokenImage
        ? ["/images/missing-product.jpg"]
        : [svgPlaceholder(category, id), svgPlaceholder(category, id + 1000)],
    };

    if (!omitDiscount) {
      product.discountPercentage = zeroDiscount ? 0 : 5 + ((id * 11) % 35);
    }
    // else: field omitted entirely, on purpose

    products.push(product);
    id += 1;
  });
}

writeFileSync(
  new URL("../src/data/products.json", import.meta.url),
  JSON.stringify(products, null, 2) + "\n"
);

console.log(`Wrote ${products.length} products across ${Object.keys(CATEGORIES).length} categories.`);
