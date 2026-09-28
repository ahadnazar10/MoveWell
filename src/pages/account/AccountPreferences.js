import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.js";
import { GoalPicker } from "../../components/GoalPicker.js";

/**
 * Built in M0 (not a stub) so the no-flash-on-refresh theme behaviour can be
 * demoed immediately — see docs/specs.md §10g. MoveWell adds the Fitness
 * Goal Profile here, sharing the same Redux state as the home and Goals pages.
 */
export function AccountPreferences() {
  const { preference, setTheme, resolved } = useTheme();

  return (
    <div>
      <h2>Preferences</h2>

      <section aria-labelledby="goal-pref-heading">
        <h3 id="goal-pref-heading">Fitness goal</h3>
        <p className="muted">
          Your goal shapes recommendations and kits across MoveWell.{" "}
          <Link to="/goals">See your goal picks</Link>
        </p>
        <GoalPicker compact label="Fitness goal" />
      </section>

      <p className="muted" style={{ marginTop: 32 }}>
        Currently rendering the {resolved} theme.
      </p>

      <fieldset className="theme-picker">
        <legend>Theme</legend>
        {["system", "light", "dark"].map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="theme-preference"
              value={option}
              checked={preference === option}
              onChange={(event) => setTheme(event.target.value)}
            />
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
