import fs from "fs";
import path from "path";

const imagesDir = path.resolve("public/images");
const images = fs.readdirSync(imagesDir);
const productsPath = path.resolve("src/data/products.json");
const products = JSON.parse(fs.readFileSync(productsPath, "utf-8"));

for (const p of products) {
  const numPrefix = String(p.id).padStart(2, "0");
  const matchingImg = images.find((img) => img.startsWith(numPrefix + "-"));

  if (matchingImg) {
    const imgPath = `/images/${matchingImg}`;
    p.thumbnail = imgPath;
    p.images = [imgPath, imgPath];
  } else {
    const fallbackPath = `/images/${numPrefix}-${p.title}.jpg`;
    p.thumbnail = fallbackPath;
    p.images = [fallbackPath, fallbackPath];
  }
}

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log("Updated products.json with realistic product image paths.");

