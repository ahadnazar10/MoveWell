/** Store-manager product form rules, free of React so they can be unit tested. */
import { DEPARTMENT_VALUES, GOAL_VALUES } from "../../utils/catalogue.js";

/** "Material: English willow" per line -> { Material: "English willow" } */
export function parseSpecs(text) {
  const specs = {};
  const badLines = [];
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const colon = line.indexOf(":");
      if (colon < 1 || colon === line.length - 1) badLines.push(index + 1);
      else specs[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
    });
  return { specs, badLines };
}

/**
 * Validates the submitted FormData. Returns { values, errors } where errors
 * is keyed by field name.
 */
export function validateProductForm(data) {
  const errors = {};
  const title = String(data.get("title") ?? "").trim();
  const description = String(data.get("description") ?? "").trim();
  const category = String(data.get("category") ?? "").trim();
  const subcategory = String(data.get("subcategory") ?? "").trim();
  const goals = (data.getAll?.("goals") ?? []).filter((g) => GOAL_VALUES.includes(g));
  const brand = String(data.get("brand") ?? "").trim();
  const price = Number(data.get("price"));
  const discountRaw = String(data.get("discountPercentage") ?? "").trim();
  const discount = discountRaw === "" ? 0 : Number(discountRaw);
  const rating = Number(data.get("rating"));
  const stock = Number(data.get("stock"));
  const { specs, badLines } = parseSpecs(String(data.get("specs") ?? ""));

  if (!title) errors.title = "Enter a title";
  else if (title.length > 160) errors.title = "Keep the title under 160 characters";
  if (!DEPARTMENT_VALUES.includes(category)) errors.category = "Choose a category";
  if (!subcategory) errors.subcategory = "Enter a type, e.g. Cricket or Sandals";
  else if (subcategory.length > 60) errors.subcategory = "Keep the type under 60 characters";
  if (!brand) errors.brand = "Enter a brand";
  if (!Number.isFinite(price) || price <= 0) errors.price = "Enter a price above ₹0";
  else if (Math.round(price * 100) !== price * 100)
    errors.price = "Use at most 2 decimal places (paise)";
  if (!Number.isFinite(discount) || discount < 0 || discount >= 100)
    errors.discountPercentage = "Use 0 to 99";
  if (!Number.isFinite(rating) || rating < 0 || rating > 5)
    errors.rating = "Use a rating from 0 to 5";
  if (!Number.isInteger(stock) || stock < 0)
    errors.stock = "Enter a whole number, 0 or more";
  if (badLines.length) errors.specs = `Line ${badLines.join(", ")}: use "Key: value"`;

  return {
    errors,
    values: {
      title,
      description,
      category,
      subcategory,
      goals,
      brand,
      price,
      discountPercentage: discount,
      rating,
      stock,
      specs,
    },
  };
}
