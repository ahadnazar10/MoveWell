/**
 * MoveWell's shared vocabulary: the three departments that came from the
 * three original stores, and the fitness goals that cut across them.
 * Values are what the data and URLs use; labels are what shoppers see.
 */
export const DEPARTMENTS = [
  {
    value: "sports",
    label: "Sports",
    tagline: "Equipment, apparel and accessories for every game.",
  },
  {
    value: "footwear",
    label: "Footwear",
    tagline: "Running, training, casual and formal shoes.",
  },
  {
    value: "health",
    label: "Health",
    tagline: "First aid, recovery and everyday health essentials.",
  },
];

export const DEPARTMENT_VALUES = DEPARTMENTS.map((d) => d.value);

export const GOALS = [
  {
    value: "running",
    label: "Running",
    blurb: "Shoes, light apparel and recovery essentials for the road or trail.",
  },
  {
    value: "gym",
    label: "Gym",
    blurb: "Training gear, weights and support for strength sessions.",
  },
  {
    value: "yoga",
    label: "Yoga",
    blurb: "Mats, props and comfortable essentials for your practice.",
  },
];

export const GOAL_VALUES = GOALS.map((g) => g.value);

export function isDepartment(value) {
  return DEPARTMENT_VALUES.includes(String(value ?? "").toLowerCase());
}

export function isGoal(value) {
  return GOAL_VALUES.includes(value);
}

export function departmentLabel(value) {
  return DEPARTMENTS.find((d) => d.value === value)?.label ?? value ?? "";
}

export function goalLabel(value) {
  return GOALS.find((g) => g.value === value)?.label ?? value ?? "";
}

/** The most specific label a product has: "Cricket", "Sandals", "First aid". */
export function productKindLabel(product) {
  return product.subcategory || departmentLabel(product.category);
}
