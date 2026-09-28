/**
 * MoveWell Kits: cross-category bundles. A kit never lists product ids —
 * each slot describes the product it wants by catalogue metadata (department,
 * goal tag, optionally subcategory), and productsService.getKits() fills it
 * with the best in-stock match at request time. So a kit keeps working when a
 * store manager edits, restocks or deletes products.
 *
 * Health slots only ever match first-aid / support / recovery items, because
 * only those carry goal tags (see scripts/merge-products.mjs). Slot labels
 * stay generic ("Health essential") for the same reason: which item fills
 * the slot can change with stock.
 */
export const KITS = [
  {
    id: "marathon-starter",
    name: "Marathon Starter Kit",
    goal: "running",
    blurb: "Road-ready shoes, light running apparel and support and recovery basics.",
    slots: [
      { label: "Running shoes", category: "footwear", goal: "running" },
      { label: "Running apparel", category: "sports", goal: "running", subcategory: "Activewear" },
      { label: "Health essential", category: "health", goal: "running" },
      { label: "Health essential", category: "health", goal: "running" },
    ],
  },
  {
    id: "gym-starter",
    name: "Gym Starter Kit",
    goal: "gym",
    blurb: "Training shoes, core equipment, gym apparel and first-aid basics.",
    slots: [
      { label: "Training shoes", category: "footwear", goal: "gym" },
      { label: "Equipment", category: "sports", goal: "gym", subcategory: "Gym equipment" },
      { label: "Gym apparel", category: "sports", goal: "gym", subcategory: "Activewear" },
      { label: "Health essential", category: "health", goal: "gym" },
    ],
  },
  {
    id: "yoga-starter",
    name: "Yoga Starter Kit",
    goal: "yoga",
    blurb: "A mat or props, light studio shoes, yoga apparel and a care essential.",
    slots: [
      { label: "Mat & props", category: "sports", goal: "yoga", subcategory: "Yoga" },
      { label: "Studio shoes", category: "footwear", goal: "yoga" },
      { label: "Yoga apparel", category: "sports", goal: "yoga", subcategory: "Activewear" },
      { label: "Health essential", category: "health", goal: "yoga" },
    ],
  },
];
