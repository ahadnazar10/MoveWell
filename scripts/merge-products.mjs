// Builds the unified MoveWell catalogue from the three store datasets.
// Run with: node scripts/merge-products.mjs
//
// Inputs (never modified):
//   src/data/products.json   FitArena  (sports)    numeric ids 1..62
//   src/data/StrideHub.json  StrideHub (footwear)  ids "prod-001".."prod-050"
//   src/data/MediKart.json   MediKart  (health)    ids "p-001".."p-066"
// Output:
//   src/data/movewell-products.json
//   public/images/footwear/<id>.svg, public/images/health/<id>.svg
//
// See docs/MERGE.md for why each rule below was chosen.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));

const SOURCES = [
  { file: "src/data/products.json", store: "FitArena", category: "sports", idBase: 0 },
  { file: "src/data/StrideHub.json", store: "StrideHub", category: "footwear", idBase: 1000 },
  { file: "src/data/MediKart.json", store: "MediKart", category: "health", idBase: 2000 },
];

const GOALS = ["running", "gym", "yoga"];

/**
 * Ids stay numeric (the whole app, persisted carts and wishlists rely on
 * integer ids), so each store gets its own range: FitArena keeps 1..62,
 * StrideHub "prod-007" -> 1007, MediKart "p-012" -> 2012.
 */
function toNumericId(rawId, idBase) {
  if (Number.isInteger(rawId)) return idBase + rawId;
  const digits = String(rawId).match(/(\d+)$/);
  if (!digits) throw new Error(`Cannot derive a numeric id from "${rawId}"`);
  return idBase + Number(digits[1]);
}

/** "suitable for" -> "Suitable for", "colour" -> "Colour"; values untouched. */
function normalizeSpecs(specs) {
  const out = {};
  for (const [key, value] of Object.entries(specs ?? {})) {
    if (value === null || value === undefined || String(value).trim() === "") continue;
    const label = key.trim().charAt(0).toUpperCase() + key.trim().slice(1);
    out[label] = value;
  }
  return out;
}

function goalsFromText(text) {
  const lower = String(text ?? "").toLowerCase();
  const found = new Set();
  if (/\brun(ning)?\b|\bspeed training\b|\btrack\b/.test(lower)) found.add("running");
  if (/\bgym\b/.test(lower)) found.add("gym");
  if (/\byoga\b/.test(lower)) found.add("yoga");
  return found;
}

/**
 * Health products are tagged only when they are general first-aid, support or
 * recovery items — never medicines (no tablets, syrups, drug names). This is
 * product placement, not advice; see docs/MERGE.md.
 */
const HEALTH_GOALS = {
  "compression socks": ["running"],
  "instant cold pack": ["running", "gym"],
  "elastic crepe bandage": ["running", "gym"],
  "adhesive bandages": ["running", "gym", "yoga"],
  "first aid kit": ["running", "gym", "yoga"],
  "antibacterial wipes": ["gym", "yoga"],
  "heating pad": ["gym", "yoga"],
  "weighing scale": ["gym"],
};

function deriveGoals(raw, category) {
  const goals = new Set();
  if (category === "sports") {
    if (raw.category === "Yoga") goals.add("yoga");
    if (raw.category === "Gym equipment") goals.add("gym");
    goalsFromText(raw.title).forEach((g) => goals.add(g));
    goalsFromText(raw.specs?.["suitable for"]).forEach((g) => goals.add(g));
  } else if (category === "footwear") {
    // Adult shoes only: a school or toddler shoe is not a training recommendation.
    if (raw.category !== "Kids shoes") {
      goalsFromText(raw.specs?.occasion).forEach((g) => goals.add(g));
      goalsFromText(raw.description).forEach((g) => goals.add(g));
    }
  } else if (category === "health") {
    const title = raw.title.toLowerCase();
    for (const [prefix, list] of Object.entries(HEALTH_GOALS)) {
      if (title.startsWith(prefix)) list.forEach((g) => goals.add(g));
    }
  }
  return GOALS.filter((g) => goals.has(g));
}

// ---------- Generated product art for stores whose image files were not supplied ----------

const ART = {
  footwear: {
    from: "#e0e7ff",
    to: "#c7d2fe",
    ink: "#312e81",
    // Simple sneaker silhouette.
    glyph:
      '<path d="M60 150c0-12 8-22 20-24l40-6c10-2 18-8 24-16l10-14c4-6 12-7 17-2 14 14 34 22 54 22h20c22 0 40 18 40 40v8H60z" fill="#4338ca"/><rect x="56" y="158" width="234" height="16" rx="8" fill="#312e81"/><path d="M150 112l14 10M166 100l14 10M182 90l14 10" stroke="#e0e7ff" stroke-width="6" stroke-linecap="round"/>',
  },
  health: {
    from: "#d1fae5",
    to: "#a7f3d0",
    ink: "#064e3b",
    // Rounded medical cross.
    glyph:
      '<rect x="145" y="70" width="56" height="130" rx="12" fill="#047857"/><rect x="108" y="107" width="130" height="56" rx="12" fill="#047857"/>',
  },
};

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wraps a title into at most 3 lines of ~26 characters. */
function wrap(text, width = 26, maxLines = 3) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else line += ` ${word}`;
  }
  if (line.trim()) lines.push(line.trim());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, width - 1)}…`;
  }
  return lines;
}

function productSvg(product, variant) {
  const art = ART[product.category];
  const lines = wrap(product.title);
  const text = lines
    .map(
      (l, i) =>
        `<text x="200" y="${238 + i * 22}" text-anchor="middle" font-family="Barlow, Segoe UI, sans-serif" font-size="18" font-weight="600" fill="${art.ink}">${escapeXml(l)}</text>`
    )
    .join("");
  const flip = variant === "alt" ? ' transform="translate(400 0) scale(-1 1)"' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="320" viewBox="0 0 400 320" role="img" aria-label="${escapeXml(product.title)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${art.from}"/><stop offset="1" stop-color="${art.to}"/></linearGradient></defs>
<rect width="400" height="320" fill="url(#g)"/>
<text x="24" y="36" font-family="Barlow, Segoe UI, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" fill="${art.ink}" opacity="0.7">${escapeXml(product.subcategory.toUpperCase())}</text>
<text x="376" y="36" text-anchor="end" font-family="Barlow, Segoe UI, sans-serif" font-size="13" font-weight="700" fill="${art.ink}" opacity="0.7">${escapeXml(product.brand ?? "")}</text>
<g${flip}>${art.glyph}</g>
${text}
</svg>
`;
}

/** FitArena ships real photos; footwear and health images were not supplied. */
function resolveImages(raw, product) {
  if (product.category === "sports") {
    return { thumbnail: raw.thumbnail, images: raw.images ?? [] };
  }
  const dir = join(root, "public", "images", product.category);
  mkdirSync(dir, { recursive: true });
  const main = `/images/${product.category}/${product.id}.svg`;
  const alt = `/images/${product.category}/${product.id}-alt.svg`;
  writeFileSync(join(dir, `${product.id}.svg`), productSvg(product, "main"));
  writeFileSync(join(dir, `${product.id}-alt.svg`), productSvg(product, "alt"));
  return { thumbnail: main, images: [main, alt] };
}

// ---------- MediKart templated specs ----------

/**
 * In MediKart.json, these keys hold one value per *category*, copied to every
 * product in it (e.g. Ibuprofen and Muscle Spray both list
 * "Composition: Paracetamol 500mg", "Dosage form: Tablet"). Shown as product
 * specs they would state wrong medicine facts, so a key that is verified to
 * be identical across a whole category is moved to `sourceCategorySpecs`
 * (kept, not displayed). Keys that do vary per product stay in `specs`.
 */
const HEALTH_TEMPLATE_CANDIDATES = ["Composition", "Dosage form", "Pack size"];

function templatedHealthKeys(rows) {
  const byCategory = new Map();
  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, []);
    byCategory.get(row.category).push(row);
  }
  const templated = new Map(); // category -> Set(keys)
  for (const [category, list] of byCategory) {
    const keys = new Set();
    for (const key of HEALTH_TEMPLATE_CANDIDATES) {
      const values = new Set(list.map((r) => r.specs?.[key]));
      if (list.length > 1 && values.size === 1 && !values.has(undefined)) keys.add(key);
    }
    templated.set(category, keys);
  }
  return templated;
}

// ---------- Merge ----------

const merged = [];
const seenIds = new Map();
const report = {
  perStore: {},
  missingDiscountField: 0,
  remappedIds: 0,
  healthTemplatedSpecsMoved: 0,
  goals: {},
};

for (const source of SOURCES) {
  const rows = read(source.file);
  report.perStore[source.store] = rows.length;
  const templated = source.category === "health" ? templatedHealthKeys(rows) : new Map();

  for (const raw of rows) {
    const id = toNumericId(raw.id, source.idBase);
    if (seenIds.has(id)) {
      throw new Error(
        `Duplicate id ${id}: ${source.store} "${raw.id}" collides with ${seenIds.get(id)}`
      );
    }
    seenIds.set(id, `${source.store} "${raw.id}"`);
    if (String(id) !== String(raw.id)) report.remappedIds += 1;
    if (raw.discountPercentage === undefined) report.missingDiscountField += 1;

    const product = {
      id,
      title: raw.title,
      description: raw.description ?? "",
      category: source.category,
      subcategory: raw.category,
      brand: raw.brand,
      price: raw.price,
      discountPercentage: raw.discountPercentage ?? 0,
      rating: raw.rating ?? 0,
      stock: raw.stock,
      specs: normalizeSpecs(raw.specs),
      goals: deriveGoals(raw, source.category),
      source: source.store,
      sourceId: String(raw.id),
    };
    const moveKeys = templated.get(raw.category);
    if (moveKeys?.size) {
      product.sourceCategorySpecs = {};
      for (const key of moveKeys) {
        if (!(key in product.specs)) continue;
        product.sourceCategorySpecs[key] = product.specs[key];
        delete product.specs[key];
        report.healthTemplatedSpecsMoved += 1;
      }
    }
    Object.assign(product, resolveImages(raw, product));
    merged.push(product);
  }
}

for (const goal of GOALS) {
  report.goals[goal] = Object.fromEntries(
    SOURCES.map((s) => [
      s.category,
      merged.filter((p) => p.category === s.category && p.goals.includes(goal)).length,
    ])
  );
}

const expected = Object.values(report.perStore).reduce((a, b) => a + b, 0);
if (merged.length !== expected) {
  throw new Error(`Lost products: expected ${expected}, merged ${merged.length}`);
}

const outFile = join(root, "src", "data", "movewell-products.json");
writeFileSync(outFile, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Wrote ${merged.length} products to ${outFile}`);
console.log(JSON.stringify(report, null, 2));
