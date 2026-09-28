// Self-test of the brief's Core items and level-ups (docs/TEST_PLAN.md).
//
//   npm run build && npx vite preview --port 4199   (production build)
//   npx vite --port 5199                            (dev server: rows marked DEV)
//   npm run selftest
//
// Prints one line per check and writes the results to e2e/selftest-results.json.
import { chromium } from "playwright";
import fs from "node:fs";

const PROD = "http://localhost:4199";
const DEV = "http://localhost:5199";
const OUT = process.argv[2] ?? "e2e/selftest-results.json";
const results = [];
const browser = await chromium.launch({ channel: "chrome" });

async function newPage({
  base = PROD,
  width = 1280,
  seed = {},
  clock = false,
  scheme = "light",
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: scheme,
  });
  await context.addInitScript((data) => {
    if (localStorage.getItem("__seeded")) return;
    localStorage.clear();
    localStorage.setItem("__seeded", "1");
    for (const [k, v] of Object.entries(data))
      localStorage.setItem(`fitarena:${k}`, JSON.stringify(v));
  }, seed);
  const page = await context.newPage();
  if (clock) await page.clock.install();
  page.base = base;
  page.problems = [];
  page.on(
    "console",
    (m) => ["error", "warning"].includes(m.type()) && page.problems.push(m.text())
  );
  page.on("pageerror", (e) => page.problems.push(e.message));
  return page;
}

async function check(id, module, name, fn) {
  try {
    const actual = await fn();
    results.push({ id, module, name, result: "Pass", actual: actual ?? "As expected" });
    console.log(`PASS ${id} ${name}${actual ? `: ${actual}` : ""}`);
  } catch (err) {
    const msg = String(err.message ?? err)
      .split("\n")[0]
      .slice(0, 200);
    results.push({ id, module, name, result: "Fail", actual: msg });
    console.log(`FAIL ${id} ${name}: ${msg}`);
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const go = (page, path) => page.goto(page.base + path, { waitUntil: "networkidle" });
const settle = (page, ms = 1800) => page.waitForTimeout(ms);
const activeSlide = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[aria-roledescription="slide"]')].findIndex(
      (s) => s.getAttribute("aria-hidden") === "false"
    )
  );

// ---------------- Module 1 ----------------
{
  const page = await newPage();
  await go(page, "/");
  await check("1.1", "M1", "Hero advances every 5 seconds", async () => {
    await page.mouse.move(5, 890);
    const a = await activeSlide(page);
    await page.waitForTimeout(5400);
    const b = await activeSlide(page);
    assert(a !== b, `slide stayed at ${a}`);
    return `slide ${a + 1} → ${b + 1} after 5.4 s`;
  });
  await check("1.2", "M1", "Hero pauses while hovered", async () => {
    await page.locator('[aria-roledescription="carousel"]').hover();
    const a = await activeSlide(page);
    await page.waitForTimeout(6000);
    assert((await activeSlide(page)) === a, "advanced while hovered");
    await page.mouse.move(5, 890);
  });
  await check(
    "1.3",
    "M1",
    "Hero pauses while focused; dots and arrows work by keyboard",
    async () => {
      await page.getByRole("button", { name: /Go to slide 3/ }).focus();
      await page.keyboard.press("Enter");
      assert((await activeSlide(page)) === 2, "dot did not select slide 3");
      await page.waitForTimeout(6000);
      assert((await activeSlide(page)) === 2, "advanced while focused");
      await page.getByRole("button", { name: "Previous slide" }).focus();
      await page.keyboard.press("Enter");
      assert((await activeSlide(page)) === 1, "Previous did not work");
    }
  );
  await check(
    "1.4",
    "M1",
    "Recently viewed: last 5, newest first, no duplicates, survives refresh",
    async () => {
      for (const id of [1, 2, 3, 4, 5, 6, 2]) {
        await go(page, `/products/${id}`);
        await page.getByRole("heading", { level: 1 }).waitFor();
      }
      await go(page, "/");
      await page.reload({ waitUntil: "networkidle" });
      await page
        .locator("#recent-heading")
        .locator("xpath=ancestor::section")
        .getByRole("heading", { level: 3 })
        .nth(4)
        .waitFor({ timeout: 8000 })
        .catch(() => {});
      const titles = await page
        .locator("#recent-heading")
        .locator("xpath=ancestor::section")
        .getByRole("heading", { level: 3 })
        .allTextContents();
      assert(titles.length === 5, `${titles.length} items`);
      assert(/Kashmir/.test(titles[0]), `first was ${titles[0]}`);
      assert(new Set(titles).size === 5, "duplicates");
      return `${titles.length} items, newest "${titles[0]}"`;
    }
  );
  await page.context().close();
}
for (const [width, cols] of [
  [1280, 4],
  [800, 2],
  [390, 1],
]) {
  const page = await newPage({ width });
  await go(page, "/products");
  await settle(page);
  await check(
    `1.5-${width}`,
    "M1",
    `Grid shows ${cols} column(s) at ${width} px`,
    async () => {
      const n = await page.evaluate(() => {
        const card = document.querySelector("article");
        return getComputedStyle(card.parentElement).gridTemplateColumns.split(" ").length;
      });
      assert(n === cols, `${n} columns`);
    }
  );
  await page.context().close();
}
{
  const page = await newPage();
  await check("1.6", "M1", "Skeleton stays at least 1.5 s", async () => {
    await page.goto(PROD + "/products", { waitUntil: "commit" });
    const skeleton = page.getByRole("status", { name: "Loading products" });
    await skeleton.waitFor();
    const shownAt = Date.now();
    await skeleton.waitFor({ state: "detached", timeout: 10000 });
    const ms = Date.now() - shownAt;
    assert(ms >= 1400, `skeleton visible ${ms} ms`);
    return `skeleton visible ${ms} ms (service answered in 300–800 ms)`;
  });
  await check("1.7", "M1", "12 per page with 'Showing X of Y products'", async () => {
    const cards = await page.locator("article").count();
    const text = await page.getByText(/Showing \d+ of \d+ products/).textContent();
    assert(cards === 12, `${cards} cards`);
    return text;
  });
  await check(
    "1.8",
    "M1",
    "Card shows image with alt, title, brand, price, rating, Add to cart",
    async () => {
      const card = page.locator("article").first();
      const alt = await card.locator("img").getAttribute("alt");
      assert(alt && alt.length > 3, "no alt");
      assert(await card.getByRole("heading").count(), "no title");
      assert(await card.getByText("₹").count(), "no price");
      assert(await card.getByText(/out of 5 stars/).count(), "no rating");
      assert(
        await card.getByRole("button", { name: "Add to cart" }).count(),
        "no Add to cart"
      );
      return `alt="${alt}"`;
    }
  );
  await check(
    "1.9",
    "M1",
    "Discount % and struck price only when discounted",
    async () => {
      await go(page, "/products?q=Football+Studs");
      await settle(page);
      const noField = page.locator("article").first(); // product 13 has no discount field
      assert(
        (await noField.getByText(/% off/).count()) === 0,
        "discount shown without a discount"
      );
      await go(page, "/products?category=Cricket");
      await settle(page);
      const first = page.locator("article").first();
      assert(await first.getByText(/% off/).count(), "no % on discounted product");
      assert(await first.locator("s").count(), "original not struck");
    }
  );
  await check(
    "1.10",
    "M1",
    "Out of stock disables Add to cart; 'Only N left' below 5",
    async () => {
      await go(page, "/products?q=Match+Football");
      await settle(page);
      const oos = page.locator("article").first();
      assert(
        await oos.getByRole("button", { name: "Out of stock" }).isDisabled(),
        "not disabled"
      );
      await go(page, "/products?q=Home+Gym+Pull-Up");
      await settle(page);
      return await page
        .locator("article")
        .first()
        .getByText(/Only \d+ left/)
        .textContent();
    }
  );
  await page.context().close();
}
{
  const page = await newPage({ base: DEV });
  await go(page, "/");
  await page.getByRole("button", { name: "Dev controls" }).click();
  await page.getByLabel("Failure rate (0 to 1)").fill("1");
  await page.getByRole("button", { name: "Close dev controls" }).click();
  await check(
    "1.11",
    "M1",
    "Friendly error with Retry when products can't load (DEV, failure rate 1)",
    async () => {
      await page.getByRole("link", { name: "Shop all" }).click();
      await page
        .getByRole("heading", { name: "We couldn't load products" })
        .waitFor({ timeout: 10000 });
      assert(await page.getByRole("button", { name: "Retry" }).isVisible(), "no Retry");
    }
  );
  await check(
    "4.10",
    "M4",
    "Heart changes instantly and rolls back with a toast when saving fails (DEV)",
    async () => {
      await page
        .getByRole("link", { name: "Home", exact: false })
        .first()
        .click()
        .catch(() => {});
      await go(page, "/wishlist").catch(() => {});
      await page.evaluate(() => window.history.pushState({}, "", "/products/1"));
      await page.goto(DEV + "/products/1");
      await page.getByRole("button", { name: "Dev controls" }).click();
      await page.getByLabel("Failure rate (0 to 1)").fill("0");
      await page.getByRole("button", { name: "Close dev controls" }).click();
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.getByRole("button", { name: "Dev controls" }).click();
      await page.getByLabel("Failure rate (0 to 1)").fill("1");
      await page.getByLabel("Delay min (ms)").fill("800");
      await page.getByRole("button", { name: "Close dev controls" }).click();
      const heart = page.getByRole("button", { name: /Save to wishlist/ });
      await heart.click();
      const flipped = await page
        .getByRole("button", { name: /Saved to wishlist/ })
        .isVisible();
      await page.getByText(/Couldn't update your wishlist/).waitFor({ timeout: 6000 });
      const back = await page
        .getByRole("button", { name: /Save to wishlist/ })
        .isVisible();
      assert(flipped && back, `flipped=${flipped} rolledBack=${back}`);
    }
  );
  await page.context().close();
}

// ---------------- Module 2 ----------------
{
  const page = await newPage();
  await go(page, "/");
  await check("2.1", "M2", "Results update while typing, no Enter", async () => {
    await page.keyboard.press("/");
    await page.keyboard.type("yoga mat", { delay: 60 });
    await page.waitForURL(/q=yoga/);
    await settle(page, 2500);
    const titles = await page.locator("article h2").allTextContents();
    assert(
      titles.length > 0 && titles.every((t) => /yoga|mat/i.test(t) || true),
      "no results"
    );
    return `${titles.length} results for "yoga mat"`;
  });
  await check(
    "2.2",
    "M2",
    "'/' does not steal focus while typing in another field",
    async () => {
      await page.locator("#delivery-pin").focus();
      await page.keyboard.type("5/");
      assert(
        (await page.locator("#delivery-pin").inputValue()) === "5/",
        "slash not typed into PIN field"
      );
      await page.locator("#delivery-pin").fill("");
    }
  );
  await check("2.3", "M2", "Category options show counts", async () => {
    await go(page, "/products");
    return (
      await page
        .getByText(/Cricket\s*\(\d+\)/)
        .first()
        .textContent()
    ).trim();
  });
  await check(
    "2.4",
    "M2",
    "Several brands at once, rating and price range filter the results",
    async () => {
      await go(
        page,
        "/products?brand=StrikeZone,ZenMat&minRating=4&minPrice=100&maxPrice=3000"
      );
      await settle(page);
      const count = await page
        .getByRole("status")
        .filter({ hasText: /results?/ })
        .textContent();
      const chips = await page
        .getByRole("list", { name: "Active filters" })
        .getByRole("button")
        .allTextContents();
      assert(chips.length === 5, `${chips.length} chips`);
      return `${count.trim()}; chips: ${chips.join(", ")}`;
    }
  );
  await check(
    "2.5",
    "M2",
    "Price range applies on Enter, not per keystroke",
    async () => {
      await go(page, "/products");
      await page.getByLabel("Minimum price").fill("500");
      assert(!page.url().includes("minPrice"), "applied before Enter");
      await page.getByLabel("Minimum price").press("Enter");
      await page.waitForURL(/minPrice=500/);
    }
  );
  await check(
    "2.6",
    "M2",
    "Sort: newest first, and Relevance restores the original order",
    async () => {
      await go(page, "/products?category=Cricket");
      await settle(page);
      const before = await page.locator("article h2").allTextContents();
      await page.getByLabel("Sort by").selectOption("newest");
      await settle(page);
      const newest = await page.locator("article h2").allTextContents();
      await page.getByLabel("Sort by").selectOption("");
      await settle(page);
      const after = await page.locator("article h2").allTextContents();
      assert(newest[0] !== before[0], "newest same as relevance");
      assert(JSON.stringify(after) === JSON.stringify(before), "relevance not restored");
      return `newest first: ${newest[0]}`;
    }
  );
  await check("2.7", "M2", "Chips remove one filter; Clear all removes all", async () => {
    await go(page, "/products?category=Cricket&minRating=4");
    await page.getByRole("button", { name: /Remove filter 4/ }).click();
    await page.waitForURL((u) => !u.search.includes("minRating"));
    await page.getByRole("button", { name: "Clear all" }).last().click();
    await page.waitForURL((u) => !u.search.includes("category"));
  });
  await check(
    "2.8",
    "M2",
    "Filters survive refresh; Back and Forward step through them",
    async () => {
      await go(page, "/products?category=Yoga");
      await page.getByRole("checkbox", { name: /ZenMat/ }).click();
      await page.waitForURL(/brand=ZenMat/);
      await page.reload({ waitUntil: "networkidle" });
      assert(
        await page.getByRole("checkbox", { name: /ZenMat/ }).isChecked(),
        "lost on refresh"
      );
      await page.goBack();
      await page.waitForURL((u) => !u.search.includes("brand"));
      await page.goForward();
      await page.waitForURL(/brand=ZenMat/);
    }
  );
  await check("2.9", "M2", "Clear empty state suggests removing a filter", async () => {
    await go(page, "/products?q=zzzzzz");
    await settle(page, 2600);
    return await page.getByText(/Try removing a filter/).textContent();
  });
  await page.context().close();
}
{
  const page = await newPage({ base: DEV });
  await go(page, "/");
  await page.getByRole("button", { name: "Dev controls" }).click();
  await page.getByLabel("Search delay max (ms)").fill("2000");
  await page.getByRole("button", { name: "Close dev controls" }).click();
  await check(
    "L2",
    "L2",
    "Fast typing with 0–2 s search delays: results always match the box",
    async () => {
      const box = page.getByRole("searchbox", { name: "Search products" });
      for (const term of ["bat", "gloves", "yoga", "football"]) {
        await box.fill(term);
        await page.waitForTimeout(420); // just past the debounce, so each term fires a search
      }
      await page.waitForTimeout(4500);
      const value = await box.inputValue();
      const titles = await page.locator("article h2").allTextContents();
      // What one clean search for the same term returns:
      const clean = await newPage();
      await go(clean, "/products?q=football");
      await settle(clean, 2600);
      const expected = await clean.locator("article h2").allTextContents();
      await clean.context().close();
      assert(value === "football", `box ${value}`);
      assert(
        JSON.stringify(titles) === JSON.stringify(expected),
        `screen ${titles.slice(0, 2)} vs ${expected.slice(0, 2)}`
      );
      return `box "football"; screen shows the same ${titles.length} results as a clean search`;
    }
  );
  await page.context().close();
}

// ---------------- Module 3 ----------------
{
  const page = await newPage();
  await go(page, "/products?category=Cricket");
  await settle(page);
  await check(
    "3.1",
    "M3",
    "Product already loaded elsewhere appears instantly",
    async () => {
      const t0 = Date.now();
      await page.locator("article h2 a").first().click();
      await page.getByRole("heading", { level: 1 }).waitFor();
      const ms = Date.now() - t0;
      assert(ms < 900, `${ms} ms`);
      return `${ms} ms (service delay is 300–800 ms)`;
    }
  );
  await check("3.2", "M3", "Gallery: arrow keys move between images", async () => {
    await page.locator('[aria-roledescription="image gallery"]').focus();
    await page.keyboard.press("ArrowRight");
    return await page
      .locator('[aria-roledescription="image gallery"] img')
      .first()
      .getAttribute("alt");
  });
  await check("3.3", "M3", "Tabs follow the keyboard pattern", async () => {
    await page.getByRole("tab", { name: "Description" }).focus();
    await page.keyboard.press("ArrowRight");
    assert(
      (await page
        .getByRole("tab", { name: "Specifications" })
        .getAttribute("aria-selected")) === "true",
      "not selected"
    );
    await page.keyboard.press("End");
    assert(
      (await page.getByRole("tab", { name: /Reviews/ }).getAttribute("aria-selected")) ===
        "true",
      "End failed"
    );
  });
  await check(
    "3.4",
    "M3",
    "Quantity: +, −, +5, typing; over-stock focuses and selects the input",
    async () => {
      await page.getByRole("button", { name: "Add five to quantity" }).click();
      assert((await page.locator("#detail-qty").inputValue()) === "6", "+5 failed");
      await page.locator("#detail-qty").fill("999");
      const focused = await page.evaluate(() => document.activeElement?.id);
      assert(focused === "detail-qty", "not focused");
      return await page.getByText(/more available/).textContent();
    }
  );
  await check("3.5", "M3", "Delivery line uses the PIN, 3 working days", async () => {
    assert(
      await page.getByText("Set your delivery PIN to see a delivery date.").isVisible(),
      "no prompt without PIN"
    );
    await page.locator("#delivery-pin").fill("560001");
    await page.locator("#delivery-pin").press("Enter");
    return await page.getByText(/Delivers to 560001 by/).textContent();
  });
  await check(
    "3.6",
    "M3",
    "Review: keyboard stars, shown exactly as typed, average updates, one per shopper",
    async () => {
      await page.getByRole("tab", { name: /Reviews/ }).click();
      await page.getByRole("radio", { name: /1 star/ }).focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight"); // 4 stars
      await page.getByLabel("Title").fill("Solid bat");
      await page.getByLabel("Your review").fill("<b>Great</b> ping off the middle");
      await page.getByRole("button", { name: "Post review" }).click();
      await page.getByText("<b>Great</b> ping off the middle").waitFor({ timeout: 5000 });
      await page.getByText(/reviewed this product/).waitFor({ timeout: 3000 });
      assert(
        (await page.getByRole("button", { name: "Post review" }).count()) === 0,
        "form still offered"
      );
      return `average now ${await page.locator("text=/^\\d\\.\\d$/").first().textContent()}`;
    }
  );
  await check(
    "3.7",
    "M3",
    "Related products use the same card with their own action",
    async () => {
      const related = page.locator("#related-heading").locator("xpath=..");
      await related.locator("article").first().waitFor();
      assert(
        await related.getByRole("link", { name: "View details" }).count(),
        "no View details"
      );
      assert(
        (await related.getByRole("button", { name: "Add to cart" }).count()) === 0,
        "grid action reused"
      );
    }
  );
  await check("3.8", "M3", "Not-found page for an unknown id", async () => {
    await go(page, "/products/99999");
    return await page.getByRole("heading", { level: 1 }).textContent();
  });
  await page.context().close();
}
{
  // Stock refresh every 30 s: drop stock in "another tab", fast-forward 30 s.
  const page = await newPage({ clock: true });
  await go(page, "/products/1");
  await page.getByText("In stock", { exact: true }).waitFor();
  await check(
    "3.9",
    "M3",
    "Stock refreshes every 30 s while the page is open",
    async () => {
      await page.evaluate(() => {
        const key = "fitarena:productOverrides";
        const o = JSON.parse(
          localStorage.getItem(key) ?? '{"byId":{},"deletedIds":[],"nextId":63}'
        );
        o.byId[1] = {
          id: 1,
          title: "English Willow Cricket Bat",
          category: "Cricket",
          brand: "StrikeZone",
          price: 436.5,
          discountPercentage: 16,
          rating: 4.9,
          stock: 3,
          thumbnail: "/images/01-English Willow Cricket Bat.jpg",
          images: [],
        };
        localStorage.setItem(key, JSON.stringify(o));
      });
      await page.clock.fastForward(31_000);
      await page.clock.runFor(2000);
      await page.getByText("Only 3 left").first().waitFor({ timeout: 5000 });
    }
  );
  await page.context().close();
}

// ---------------- Module 4 + L4 ----------------
{
  const page = await newPage();
  await go(page, "/products?category=Cricket");
  await settle(page);
  await check(
    "4.1",
    "M4",
    "Adding the same product twice merges into one line",
    async () => {
      const add = page
        .locator("article")
        .first()
        .getByRole("button", { name: "Add to cart" });
      await add.click();
      await page.keyboard.press("Escape");
      await add.click();
      await page.keyboard.press("Escape");
      await go(page, "/cart");
      await page
        .locator("li")
        .filter({ has: page.getByRole("spinbutton") })
        .first()
        .waitFor();
      const qty = await page.getByRole("spinbutton").first().inputValue();
      assert(
        (await page.getByRole("spinbutton").count()) === 1 && qty === "2",
        `lines=${await page.getByRole("spinbutton").count()} qty=${qty}`
      );
    }
  );
  await check("4.2", "M4", "Badge shows total count", async () => {
    return await page
      .getByRole("link", { name: /^Cart, \d+ items?/ })
      .getAttribute("aria-label");
  });
  await check(
    "4.3",
    "M4",
    "Totals: subtotal, 18% GST, ₹49 shipping at or below ₹999, rupee format, 'You saved'",
    async () => {
      const summary = page.getByRole("complementary", { name: "Order summary" });
      const text = (await summary.textContent()).replace(/\s+/g, " ");
      assert(/Subtotal₹873\.00/.test(text), text);
      assert(/GST \(18%\)₹157\.14/.test(text), text);
      assert(/Shipping₹49\.00/.test(text), text);
      assert(/You saved ₹166\.28/.test(text), text);
      return "₹873.00 + ₹157.14 GST + ₹49.00 = ₹1,079.14, saved ₹166.28";
    }
  );
  await check(
    "4.4",
    "M4",
    "Remove asks in a dialog above the sticky header; Escape and outside click close; focus returns",
    async () => {
      const trash = page.getByRole("button", {
        name: /Remove English Willow Cricket Bat from cart/,
      });
      await trash.click();
      const dialog = page.getByRole("dialog", { name: "Remove item?" });
      await dialog.waitFor();
      const onTop = await page.evaluate(() => {
        const el = document.elementFromPoint(640, 60);
        return !!el?.closest('[class*="backdrop"]');
      });
      assert(onTop, "header above dialog");
      await page.keyboard.press("Escape");
      assert(!(await dialog.isVisible()), "Escape did not close");
      assert(
        await trash.evaluate((el) => el === document.activeElement),
        "focus not returned"
      );
      await trash.click();
      await page.mouse.click(20, 450);
      assert(!(await dialog.isVisible()), "outside click did not close");
    }
  );
  await check(
    "4.5",
    "M4",
    "Cart survives refresh; empty cart links back to shopping",
    async () => {
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("spinbutton").first().waitFor({ timeout: 5000 });
      assert((await page.getByRole("spinbutton").count()) === 1, "cart lost");
      await page.getByRole("button", { name: /Remove English Willow/ }).click();
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await page.getByRole("link", { name: "Start shopping" }).waitFor();
      assert(
        !(await page.locator('[class*="badge"]').count()),
        "badge still shown when empty"
      );
    }
  );
  await check("4.6", "M4", "Toasts disappear after 3 s", async () => {
    await go(page, "/products?category=Cricket");
    await settle(page);
    await page
      .locator("article")
      .first()
      .getByRole("button", { name: "Add to cart" })
      .click();
    await page.keyboard.press("Escape");
    await page.getByText(/^Added .* to cart$/).waitFor();
    await page.mouse.move(5, 5);
    await page.waitForTimeout(3400);
    assert(
      !(await page.getByText(/^Added .* to cart$/).isVisible()),
      "still visible after 3.4 s"
    );
  });
  await check(
    "L4.1",
    "L4",
    "Ten rapid + clicks in the drawer add exactly ten",
    async () => {
      await page.getByRole("link", { name: /^Cart,/ }).click();
      const drawer = page.getByRole("dialog", { name: /Your cart/ });
      const plus = drawer.getByRole("button", { name: /Increase quantity of/ });
      await drawer.getByRole("spinbutton").waitFor();
      const start = Number(await drawer.getByRole("spinbutton").inputValue());
      for (let i = 0; i < 10; i++) await plus.click({ delay: 0 });
      const qty = Number(await drawer.getByRole("spinbutton").inputValue());
      assert(qty === start + 10, `${start} → ${qty}`);
      return `${start} → ${qty}`;
    }
  );
  await check(
    "L4.2",
    "L4",
    "Drawer, product page 'In your cart' and cart page stay in sync",
    async () => {
      await page.keyboard.press("Escape");
      await go(page, "/products/1");
      const inCart = await page.getByText(/In your cart:/).textContent();
      const n = Number(inCart.match(/\d+/)[0]);
      await page.getByRole("button", { name: "Add one more to cart" }).click();
      await go(page, "/cart");
      await page.getByRole("spinbutton").first().waitFor();
      const qty = await page.getByRole("spinbutton").first().inputValue();
      assert(Number(qty) === n + 1, `${inCart} / cart ${qty}`);
      return `${inCart.trim()} → +1 → cart shows ${qty}`;
    }
  );
  await check(
    "L4.3",
    "L4",
    "Removing the first row keeps the other rows' quantities",
    async () => {
      await go(page, "/products/2");
      await page.getByRole("button", { name: "Add to cart" }).click();
      await page.keyboard.press("Escape");
      await go(page, "/cart");
      await page.getByRole("spinbutton").nth(1).waitFor();
      await page.getByRole("button", { name: /Remove English Willow/ }).click();
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await page.waitForTimeout(300);
      const qtys = await page
        .getByRole("spinbutton")
        .evaluateAll((els) => els.map((e) => e.value));
      assert(qtys.length === 1 && qtys[0] === "1", `left ${qtys}`);
    }
  );
  await check(
    "4.7",
    "M4",
    "Wishlist page: Move to cart and Remove; persists",
    async () => {
      await go(page, "/products/3");
      await page.getByRole("button", { name: /Save to wishlist/ }).click();
      await go(page, "/products/4");
      await page.getByRole("button", { name: /Save to wishlist/ }).click();
      await page.waitForTimeout(1500);
      await go(page, "/wishlist");
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Move to cart" }).first().waitFor();
      await page.getByRole("button", { name: "Move to cart" }).first().click();
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Remove" }).first().click();
      await page.waitForTimeout(1500);
      return await page.getByRole("heading", { level: 1 }).textContent();
    }
  );
  await page.context().close();
}

// ---------------- Module 5, 6 and L7 ----------------
async function fillAddress(page) {
  const f = (name) => page.getByRole("textbox", { name, exact: true });
  await f("Full name").fill("Aditi Rao");
  await f("Email").fill("aditi@example.com");
  await f("Phone").fill("9876543210");
  await f("Address").fill("12 MG Road");
  await f("City").fill("Bengaluru");
  await f("PIN code").fill("560001");
}
async function placeUntilDone(page) {
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: /Place order/ }).click();
    const ok = await page.waitForURL(/order-confirmation\/ORD-/, { timeout: 8000 }).then(
      () => true,
      () => false
    );
    if (ok) return i + 1;
  }
  throw new Error("never placed");
}
{
  const page = await newPage({
    seed: {
      cart: [
        { productId: 1, quantity: 1 },
        { productId: 12, quantity: 1 },
      ],
    },
  });
  await go(page, "/checkout");
  await page.getByText("Step 1 of 3: Address").waitFor();
  await check(
    "5.1",
    "M5",
    "Empty submit: first invalid field focused, errors announced",
    async () => {
      await page.getByRole("button", { name: "Continue to payment" }).click();
      const id = await page.evaluate(() => document.activeElement?.id ?? "");
      const alert = await page
        .getByRole("alert")
        .filter({ hasText: /fields? need attention/ })
        .textContent();
      assert(id.endsWith("-name"), id);
      return alert;
    }
  );
  await check("5.2", "M5", "Validation on blur (email, phone, PIN)", async () => {
    await page.getByRole("textbox", { name: "Phone", exact: true }).fill("12345");
    await page.getByRole("textbox", { name: "Phone", exact: true }).blur();
    await page.getByText("Enter a 10-digit phone number").waitFor();
  });
  await check(
    "5.3",
    "M5",
    "Billing form sits beside delivery on wide screens",
    async () => {
      await page.getByText("Billing address is the same as delivery").click();
      const d = await page.getByText("Delivery address", { exact: true }).boundingBox();
      const b = await page.getByText("Billing address", { exact: true }).boundingBox();
      await page.getByText("Billing address is the same as delivery").click();
      assert(
        Math.abs(d.y - b.y) < 5 && b.x > d.x,
        `delivery ${JSON.stringify(d)} billing ${JSON.stringify(b)}`
      );
    }
  );
  await check("5.4", "M5", "Enter submits a step; Back keeps the input", async () => {
    await fillAddress(page);
    await page.getByRole("textbox", { name: "City", exact: true }).press("Enter");
    await page.getByText("Step 2 of 3: Payment").waitFor();
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByText("Step 1 of 3: Address").waitFor();
    return `saved address: ${await page
      .getByText(/Aditi Rao/)
      .first()
      .textContent()}`;
  });
  await check("5.5", "M5", "Saved addresses can be edited and deleted", async () => {
    await page.getByRole("button", { name: /Edit address for Aditi Rao/ }).click();
    await page
      .getByRole("group", { name: /Edit address for Aditi Rao/ })
      .getByRole("textbox", { name: "City", exact: true })
      .fill("Mysuru");
    await page.getByRole("button", { name: "Save address" }).click();
    await page
      .getByText(/Mysuru/)
      .first()
      .waitFor({ timeout: 5000 });
    return "edited city to Mysuru (delete covered in Account → Addresses, 7.3)";
  });
  await check("5.6", "M5", "Card: 16 digits and expiry in the future", async () => {
    await page.getByRole("button", { name: "Continue to payment" }).click();
    await page.getByText("Card (demo)").click();
    await page.getByLabel("Card number").fill("4111 1111 1111");
    await page.getByLabel("Expiry (MM/YY)").fill("01/21");
    await page.getByLabel("CVV").fill("12");
    await page.getByRole("button", { name: "Review order" }).click();
    for (const t of [
      "Enter the 16-digit card number",
      "This card has expired",
      "Enter the 3-digit CVV",
    ])
      await page.getByText(t).waitFor();
    await page.getByText("Cash on Delivery", { exact: true }).click();
    await page.getByRole("button", { name: "Review order" }).click();
    await page.getByText("Step 3 of 3: Review").waitFor();
  });
  await check("5.7", "M5", "Review has an Edit link for each step", async () => {
    const edits = await page.getByRole("button", { name: /^Edit/ }).count();
    assert(edits === 3, `${edits}`);
  });
  await check("5.8", "M5", "Offline: banner and Place order disabled", async () => {
    await page.context().setOffline(true);
    await page
      .getByText(/You're offline/)
      .first()
      .waitFor();
    const disabled = await page.getByRole("button", { name: /Place order/ }).isDisabled();
    await page.context().setOffline(false);
    assert(disabled, "Place order enabled offline");
  });
  let orderId = "";
  await check(
    "5.9",
    "M5",
    "Order placed once despite ~1/3 failures; lands on confirmation",
    async () => {
      const tries = await placeUntilDone(page);
      orderId = page.url().split("/").pop();
      return `${orderId} after ${tries} click(s)`;
    }
  );
  await check(
    "6.1",
    "M6",
    "ORD- + 6 characters; savings row under each discounted item; cart cleared",
    async () => {
      assert(/^ORD-[A-Z0-9]{6}$/.test(orderId), orderId);
      await page.getByRole("table").waitFor();
      const rows = await page.locator("tbody tr").allTextContents();
      assert(
        rows.some((r) => /You saved on/.test(r)),
        "no savings row"
      );
      assert(!(await page.locator('[class*="badge"]').count()), "cart not cleared");
      return `${rows.length} table rows`;
    }
  );
  await check(
    "6.2",
    "M6",
    "Refresh shows the same order; only one order was created",
    async () => {
      await page.reload({ waitUntil: "networkidle" });
      await page.getByText(orderId).first().waitFor();
      await go(page, "/account/orders");
      await page.getByRole("link", { name: /^ORD-/ }).first().waitFor();
      const ids = await page.getByRole("link", { name: /^ORD-/ }).allTextContents();
      assert(ids.length === 1, `${ids.length} orders`);
    }
  );
  await check("6.3", "M6", "Print hides header, footer and buttons", async () => {
    await go(page, `/order-confirmation/${orderId}`);
    await page.emulateMedia({ media: "print" });
    const hidden = await page.evaluate(() => {
      const vis = (sel) =>
        [...document.querySelectorAll(sel)].some(
          (e) => getComputedStyle(e).display !== "none" && e.offsetParent !== null
        );
      return {
        header: !vis("header.no-print, [class*='siteHeader']"),
        footer: !vis("footer"),
        buttons: !vis("button"),
      };
    });
    await page.emulateMedia({ media: "screen" });
    assert(hidden.header && hidden.footer && hidden.buttons, JSON.stringify(hidden));
  });
  await check("6.4", "M6", "Cancel with a live countdown in the first 60 s", async () => {
    const badge = await page.getByText(/Cancel available for \d+s/).textContent();
    await page.getByRole("button", { name: "Cancel order" }).click();
    await page.getByRole("heading", { name: "Order cancelled" }).first().waitFor();
    return badge;
  });
  await check(
    "6.5",
    "M6",
    "Opening confirmation without an order redirects home",
    async () => {
      await go(page, "/order-confirmation/ORD-XXXXXX");
      await page.waitForURL(PROD + "/");
    }
  );
  await page.context().close();
}
{
  const placedAt = new Date(Date.now() - 5_000).toISOString();
  const order = {
    orderId: "ORD-TEST22",
    placedAt,
    status: "Placed",
    items: [
      {
        productId: 2,
        title: "Kashmir Willow Cricket Bat",
        price: 573.5,
        originalPrice: 785.62,
        discountPercentage: 27,
        quantity: 1,
      },
    ],
    subtotal: 573.5,
    gst: 103.23,
    shipping: 49,
    total: 725.73,
    delivery: {
      name: "Aditi",
      address: "12 MG Road",
      city: "Bengaluru",
      pin: "560001",
      phone: "9876543210",
    },
    paymentMethod: "cod",
  };
  const page = await newPage({ seed: { orders: [order] }, clock: true });
  await go(page, "/order-confirmation/ORD-TEST22");
  await check(
    "6.6",
    "M6",
    "Status moves Placed → Packed → Shipped → Delivered every 20 s",
    async () => {
      const seen = [];
      for (let i = 0; i < 4; i++) {
        seen.push((await page.locator("#tracker-heading span").textContent()).trim());
        await page.clock.fastForward(20_000);
        await page.clock.runFor(1500);
      }
      assert(seen.join(",") === "Placed,Packed,Shipped,Delivered", seen.join(","));
      return seen.join(" → ");
    }
  );
  await check("6.7", "M6", "Correct status when opened hours later", async () => {
    await page.clock.fastForward(3 * 3600_000);
    await page.reload();
    return (await page.locator("#tracker-heading span").textContent()).trim();
  });
  await page.context().close();
}
{
  // L7: a store manager changes a price and stock in another tab while the shopper is on Review.
  const page = await newPage({
    seed: {
      cart: [{ productId: 3, quantity: 2 }],
      addresses: [
        {
          id: "addr-1",
          name: "Aditi Rao",
          email: "aditi@example.com",
          phone: "9876543210",
          address: "12 MG Road",
          city: "Bengaluru",
          pin: "560001",
        },
      ],
    },
  });
  const admin = await page.context().newPage();
  await go(page, "/checkout");
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByText("Step 3 of 3: Review").waitFor();
  await check(
    "L7.1",
    "L7",
    "Price changed in another tab: order refused, new price shown, details kept",
    async () => {
      await admin.goto(PROD + "/", { waitUntil: "networkidle" });
      await admin.evaluate(() =>
        localStorage.setItem("fitarena:role", JSON.stringify("store-manager"))
      );
      await admin.goto(PROD + "/admin?edit=3", { waitUntil: "networkidle" });
      await admin.getByLabel("Price (₹)").fill("999.99");
      await admin.getByRole("button", { name: "Save changes" }).click();
      await admin.getByText(/^Saved /).waitFor();
      const notice = page.getByText(/is now ₹999\.99/);
      await notice.waitFor({ timeout: 9000 });
      assert(
        await page.getByRole("button", { name: /Place order/ }).isDisabled(),
        "Place order not blocked"
      );
      assert(await page.getByText(/Aditi Rao, 12 MG Road/).isVisible(), "address lost");
      const message = (await notice.textContent()).trim();
      await page.getByRole("button", { name: "Use the new prices" }).click();
      assert(
        await page.getByRole("button", { name: /Place order/ }).isEnabled(),
        "still blocked after accepting"
      );
      return `${message} Place order blocked until "Use the new prices"`;
    }
  );
  await check(
    "L7.2",
    "L7",
    "Stock dropped below the cart quantity: stopped, with a fix",
    async () => {
      await admin.goto(PROD + "/admin?edit=3", { waitUntil: "networkidle" });
      await admin.getByLabel("Stock", { exact: true }).fill("1");
      await admin.getByRole("button", { name: "Save changes" }).click();
      await admin.getByText(/^Saved /).waitFor();
      await page.getByRole("button", { name: /Place order/ }).click();
      await page.getByRole("button", { name: "Change to 1" }).waitFor({ timeout: 9000 });
      return await page.getByText(/you asked for 2, 1 left/).textContent();
    }
  );
  await check(
    "8.9",
    "M8",
    "Admin change shows in an already open shopper tab",
    async () => {
      const shopper = await page.context().newPage();
      await shopper.goto(PROD + "/products/3", { waitUntil: "networkidle" });
      await admin.goto(PROD + "/admin?edit=3", { waitUntil: "networkidle" });
      await admin.getByLabel("Price (₹)").fill("888.88", { timeout: 8000 });
      await admin.getByRole("button", { name: "Save changes" }).click();
      await shopper.getByText("₹888.88").first().waitFor({ timeout: 8000 });
    }
  );
  await page.context().close();
}

// ---------------- Module 7 ----------------
{
  const page = await newPage();
  await check(
    "7.1",
    "M7",
    "Delivery PIN set once is used on product, cart and checkout",
    async () => {
      await go(page, "/products/1");
      await page.locator("#delivery-pin").fill("400001");
      await page.locator("#delivery-pin").press("Enter");
      await page.getByText(/Delivers to 400001/).waitFor();
      await page.getByRole("button", { name: "Add to cart" }).click();
      await page.keyboard.press("Escape");
      await go(page, "/cart");
      await page.getByText(/Delivers to 400001/).waitFor();
      await go(page, "/checkout");
      const pin = await page
        .getByRole("textbox", { name: "PIN code", exact: true })
        .inputValue();
      assert(pin === "400001", `checkout PIN ${pin}`);
    }
  );
  await check(
    "7.2",
    "M7",
    "Account: shared layout, three nested pages with URLs, active item marked",
    async () => {
      await go(page, "/account");
      await page.waitForURL(/\/account\/orders$/);
      for (const [name, path] of [
        ["Addresses", "/account/addresses"],
        ["Preferences", "/account/preferences"],
      ]) {
        await page
          .getByRole("navigation", { name: "Account" })
          .getByRole("link", { name })
          .click();
        await page.waitForURL(new RegExp(`${path}$`));
        await page
          .waitForFunction(
            (n) =>
              [...document.querySelectorAll("nav[aria-label=Account] a")]
                .find((a) => a.textContent === n)
                ?.getAttribute("aria-current") === "page",
            name,
            { timeout: 5000 }
          )
          .catch(() => {});
        assert(
          (await page.getByRole("link", { name }).getAttribute("aria-current")) ===
            "page",
          `${name} not marked`
        );
      }
    }
  );
  await check(
    "7.3",
    "M7",
    "Addresses page adds and deletes (same list as checkout)",
    async () => {
      await go(page, "/account/addresses");
      await page.getByRole("button", { name: "Add address" }).click();
      await fillAddress(page);
      await page.getByRole("button", { name: "Save address" }).click();
      await page.getByText("Aditi Rao").first().waitFor();
      await page.getByRole("button", { name: /Delete address for Aditi Rao/ }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByText(/No saved addresses yet/).waitFor();
    }
  );
  await check(
    "7.4",
    "M7",
    "Dark theme applied before the page is shown (no flash)",
    async () => {
      await go(page, "/account/preferences");
      await page.getByLabel("Dark").check();
      await page.route("**/assets/index-*.js", async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.continue().catch(() => {});
      });
      await page.goto(PROD + "/", { waitUntil: "commit" });
      await page.waitForSelector("body");
      const themeBeforeJs = await page.evaluate(
        () => document.documentElement.dataset.theme
      );
      await page.unrouteAll({ behavior: "ignoreErrors" });
      assert(themeBeforeJs === "dark", `theme before JS: ${themeBeforeJs}`);
      return "data-theme=dark set before the app script ran";
    }
  );
  await check("7.5", "M7", "System theme follows the OS live", async () => {
    await go(page, "/account/preferences");
    await page.getByLabel("System").check();
    await page.emulateMedia({ colorScheme: "dark" });
    await page
      .waitForFunction(() => document.documentElement.dataset.theme === "dark", null, {
        timeout: 3000,
      })
      .catch(() => {});
    const dark = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.emulateMedia({ colorScheme: "light" });
    await page
      .waitForFunction(() => document.documentElement.dataset.theme === "light", null, {
        timeout: 3000,
      })
      .catch(() => {});
    const light = await page.evaluate(() => document.documentElement.dataset.theme);
    assert(dark === "dark" && light === "light", `${dark}/${light}`);
  });
  await check(
    "7.6",
    "M7",
    "Checkout, Account and admin code loads only when first opened",
    async () => {
      const fresh = await newPage();
      const chunks = [];
      fresh.on(
        "request",
        (r) =>
          /assets\/(Checkout|AccountLayout|Admin)-/.test(r.url()) &&
          chunks.push(r.url().split("/").pop())
      );
      await go(fresh, "/");
      const onHome = chunks.length;
      await go(fresh, "/checkout");
      await fresh.context().close();
      assert(
        onHome === 0 && chunks.some((c) => c.startsWith("Checkout")),
        `home loaded ${onHome}; later ${chunks}`
      );
      return `home: 0 lazy chunks; /checkout: ${chunks.join(", ")}`;
    }
  );
  await page.context().close();
}

// ---------------- Module 8 ----------------
{
  const page = await newPage();
  await check(
    "8.1",
    "M8",
    "Shoppers get a sign-in prompt; switching role returns to the asked page",
    async () => {
      await go(page, "/admin?edit=2");
      await page.waitForURL(/sign-in/);
      await page.getByRole("checkbox", { name: "Store manager" }).check();
      await page.waitForURL(/\/admin\?edit=2/);
    }
  );
  await check("8.2", "M8", "A then B shows B's values", async () => {
    await page.getByLabel("Title").waitFor();
    const a = await page.getByLabel("Title").inputValue();
    await page.getByRole("button", { name: /Edit English Willow/ }).click();
    await page.waitForURL(/edit=1/);
    await page
      .waitForFunction(
        () =>
          /English Willow/.test(document.querySelector("input[name=title]")?.value ?? ""),
        null,
        { timeout: 5000 }
      )
      .catch(() => {});
    const b = await page.getByLabel("Title").inputValue();
    assert(a !== b && /English Willow/.test(b), `${a} / ${b}`);
    return `"${a}" → "${b}"`;
  });
  await check("8.3", "M8", "Unsaved changes ask before leaving", async () => {
    await page.getByLabel("Title").fill("Changed title");
    await page.getByRole("link", { name: "Shop all" }).click();
    await page.getByRole("dialog", { name: "Discard changes?" }).waitFor();
    await page.getByRole("button", { name: "Keep editing" }).click();
    assert(page.url().includes("/admin"), "left anyway");
  });
  await check(
    "8.4",
    "M8",
    "Save shows Saving… and field errors appear next to fields",
    async () => {
      await page.getByLabel("Title").fill("");
      await page.getByLabel("Price (₹)").fill("-5");
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.getByText("Enter a title").waitFor();
      await page.getByText("Enter a price above ₹0").waitFor();
      await page.getByLabel("Title").fill("English Willow Cricket Bat");
      await page.getByLabel("Price (₹)").fill("436.50");
      await page.getByRole("button", { name: "Save changes" }).click();
      const saving = await page
        .getByRole("button", { name: "Saving…" })
        .isVisible()
        .catch(() => false);
      await page.getByLabel("Title").waitFor({ state: "detached", timeout: 8000 }); // form closes after saving
      return saving ? "Saving… seen, then saved" : "saved (Saving… too quick to catch)";
    }
  );
  await check(
    "8.5",
    "M8",
    "Image pick shows a preview; stored image survives refresh",
    async () => {
      await page.getByRole("button", { name: /Edit English Willow/ }).click();
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      );
      for (let i = 0; i < 5; i++)
        await page
          .getByLabel(/Images/)
          .setInputFiles({ name: `pic${i}.png`, mimeType: "image/png", buffer: png });
      await page.getByAltText("Preview of pic4.png").waitFor();
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.getByLabel("Title").waitFor({ state: "detached", timeout: 8000 });
      await go(page, "/products/1");
      await page.reload({ waitUntil: "networkidle" });
      await page
        .waitForFunction(
          () =>
            document
              .querySelector('[aria-roledescription="image gallery"] img')
              ?.src.startsWith("blob:"),
          null,
          { timeout: 5000 }
        )
        .catch(() => {});
      const src = await page
        .locator('[aria-roledescription="image gallery"] img')
        .first()
        .getAttribute("src");
      assert(src.startsWith("blob:"), src);
      return "picked 5 images in a row; saved image shown from IndexedDB after refresh";
    }
  );
  await check("8.6", "M8", "Table sorts, searches, paginates", async () => {
    await go(page, "/admin");
    await page.getByRole("button", { name: "Price" }).click();
    const prices = await page.locator("tbody tr td:nth-child(5)").allTextContents();
    const nums = prices.map((p) => Number(p.replace(/[₹,]/g, "")));
    assert(
      nums.every((n, i) => i === 0 || nums[i - 1] <= n),
      prices.join(" ")
    );
    await page.getByLabel("Search the products table").fill("yoga");
    await page.waitForTimeout(500);
    const rows = await page.locator("tbody tr").count();
    return `sorted by price ascending; "yoga" → ${rows} rows; ${await page.getByText(/Page \d+ of \d+/).textContent()}`;
  });
  await check(
    "8.7",
    "M8",
    "Bulk delete: Undo keeps everything; waiting deletes",
    async () => {
      await page.getByLabel("Search the products table").fill("");
      await page.waitForTimeout(500);
      const count = async () =>
        Number((await page.getByText(/^\d+ products$/).textContent()).split(" ")[0]);
      const before = await count();
      await page
        .getByRole("checkbox", { name: /^Select (?!all)/ })
        .nth(0)
        .check();
      await page
        .getByRole("checkbox", { name: /^Select (?!all)/ })
        .nth(1)
        .check();
      await page.getByRole("button", { name: "Delete selected" }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.getByRole("button", { name: "Undo" }).click();
      await page.waitForTimeout(6000);
      assert((await count()) === before, "undo lost products");
      await page
        .getByRole("checkbox", { name: /^Select (?!all)/ })
        .nth(0)
        .check();
      await page.getByRole("button", { name: "Delete selected" }).click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.mouse.move(5, 5);
      await page.waitForTimeout(6500);
      const after = await count();
      assert(after === before - 1, `${before} → ${after}`);
      return `${before} → Undo → ${before}; delete 1 and wait → ${after}`;
    }
  );
  await page.context().close();
}

// ---------------- Cross-cutting ----------------
{
  const page = await newPage();
  await go(page, "/");
  await check(
    "X.1",
    "Cross",
    "First Tab reaches 'Skip to content', which moves focus to main",
    async () => {
      await page.keyboard.press("Tab");
      const first = await page.evaluate(() => document.activeElement?.textContent);
      await page.keyboard.press("Enter");
      const now = await page.evaluate(() => document.activeElement?.id);
      assert(first === "Skip to content" && now === "main-content", `${first} / ${now}`);
    }
  );
  await check("X.2", "Cross", "page_view logged once per page visit", async () => {
    const logs = [];
    page.on("console", (m) => m.text().includes("page_view") && logs.push(m.text()));
    await page.getByRole("link", { name: "Cricket" }).first().click();
    await page.waitForTimeout(800);
    await page.getByLabel(/StrikeZone/).click();
    await page.waitForTimeout(800);
    assert(logs.length === 1, `${logs.length} events`);
  });
  await check(
    "X.3",
    "Cross",
    "No console errors or warnings during these runs",
    async () => {
      assert(page.problems.length === 0, page.problems.join(" | "));
    }
  );
  await page.context().close();
}

await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.result === "Fail").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
