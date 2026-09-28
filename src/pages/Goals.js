import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { GoalPicker } from "../components/GoalPicker.js";
import { Recommendations } from "../components/Recommendations.js";
import { KitCard } from "../components/KitCard.js";
import { DEPARTMENT_ICONS } from "../components/catalogueIcons.js";
import { selectFitnessGoal, setGoal } from "../features/profile/profileSlice.js";
import {
  loadKits,
  selectKits,
  selectCatalogueVersion,
} from "../features/products/productsSlice.js";
import { DEPARTMENTS, goalLabel, isGoal } from "../utils/catalogue.js";
import styles from "./Goals.module.css";

/**
 * MoveWell Fitness Goal Profile page. The chosen goal lives in Redux
 * (profileSlice) and persists, so it also shapes the home page. A link such
 * as /goals?goal=running (footer) sets the goal once and then drops the
 * parameter, leaving the profile as the single source of truth.
 */
export function Goals() {
  const dispatch = useDispatch();
  const goal = useSelector(selectFitnessGoal);
  const kits = useSelector(selectKits);
  const catalogueVersion = useSelector(selectCatalogueVersion);
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedGoal = searchParams.get("goal");

  useEffect(() => {
    if (!linkedGoal) return;
    if (isGoal(linkedGoal)) dispatch(setGoal(linkedGoal));
    setSearchParams({}, { replace: true });
  }, [dispatch, linkedGoal, setSearchParams]);

  useEffect(() => {
    dispatch(loadKits());
  }, [dispatch, catalogueVersion]);

  const kit = kits.items.find((k) => k.goal === goal);
  const label = goalLabel(goal);

  return (
    <div className="container section">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Fitness goal profile</p>
        <h1 className={styles.title}>What&apos;s your fitness goal?</h1>
        <p className={styles.lead}>
          Pick one and MoveWell brings together sports gear, footwear and health
          essentials for it. Your choice is saved on this device and shapes what you see
          on the home page.
        </p>
      </header>

      <GoalPicker />

      {goal ? (
        <>
          <section className={styles.section} aria-labelledby="goal-picks-heading">
            <div className={styles.sectionHeader}>
              <h2 id="goal-picks-heading">Picked for {label}</h2>
              <Link to={`/products?goal=${goal}`} className={styles.viewAll}>
                All {label.toLowerCase()} products{" "}
                <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <Recommendations goal={goal} limit={8} gridClassName={styles.grid} />
          </section>

          <section className={styles.section} aria-labelledby="goal-depts-heading">
            <h2 id="goal-depts-heading">Shop {label.toLowerCase()} by category</h2>
            <ul className={styles.deptLinks}>
              {DEPARTMENTS.map((d) => {
                const Icon = DEPARTMENT_ICONS[d.value];
                return (
                  <li key={d.value}>
                    <Link
                      to={`/products?category=${d.value}&goal=${goal}`}
                      className={styles.deptLink}
                      data-dept={d.value}
                    >
                      <Icon size={26} aria-hidden="true" />
                      <span>
                        {label} {d.label.toLowerCase()}
                      </span>
                      <ArrowRightIcon size={16} weight="bold" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {kit && (
            <section className={styles.section} aria-labelledby="goal-kit-heading">
              <h2 id="goal-kit-heading">Your starter kit</h2>
              <div className={styles.kitWrap}>
                <KitCard kit={kit} />
              </div>
            </section>
          )}
        </>
      ) : (
        <p className={`muted ${styles.hint}`}>
          Choose a goal above to see recommendations from all three MoveWell categories.
        </p>
      )}
    </div>
  );
}
