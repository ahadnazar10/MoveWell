import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { CheckIcon } from "@phosphor-icons/react";
import { GOALS } from "../utils/catalogue.js";
import { setGoal, clearGoal, selectFitnessGoal } from "../features/profile/profileSlice.js";
import { showToast } from "../features/ui/uiSlice.js";
import { GOAL_ICONS } from "./catalogueIcons.js";
import styles from "./GoalPicker.module.css";

/**
 * MoveWell Fitness Goal Profile picker. Used on the home page, the Goals
 * page and Account → Preferences; all three read and write the same
 * `profile.goal` in Redux, so choosing a goal anywhere updates everywhere
 * (and in other open tabs).
 *
 * Toggle buttons with aria-pressed rather than radios: pressing the chosen
 * goal again clears it, which radios cannot express.
 */
export function GoalPicker({ compact = false, label = "Choose your fitness goal" }) {
  const dispatch = useDispatch();
  const goal = useSelector(selectFitnessGoal);

  function choose(value) {
    if (value === goal) {
      dispatch(clearGoal());
      dispatch(showToast("Fitness goal cleared", "info"));
      return;
    }
    dispatch(setGoal(value));
    const chosen = GOALS.find((g) => g.value === value);
    dispatch(showToast(`Fitness goal set to ${chosen.label}`, "success"));
  }

  return (
    <div
      className={`${styles.picker} ${compact ? styles.compact : ""}`}
      role="group"
      aria-label={label}
    >
      {GOALS.map((option) => {
        const Icon = GOAL_ICONS[option.value];
        const selected = option.value === goal;
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.option} ${selected ? styles.selected : ""}`}
            aria-pressed={selected}
            onClick={() => choose(option.value)}
          >
            <span className={styles.iconWrap} aria-hidden="true">
              <Icon size={compact ? 22 : 30} weight={selected ? "fill" : "regular"} />
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{option.label}</span>
              {!compact && <span className={styles.blurb}>{option.blurb}</span>}
            </span>
            {selected && (
              <span className={styles.check} aria-hidden="true">
                <CheckIcon size={14} weight="bold" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

GoalPicker.propTypes = {
  compact: PropTypes.bool,
  label: PropTypes.string,
};
