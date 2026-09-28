import { useState, useSyncExternalStore } from "react";
import { devConfig } from "../services/devConfig.js";
import { clearAllImages } from "../services/imagesService.js";
import { resetAllStoredData } from "../utils/storage.js";
import { ConfirmDialog } from "./ConfirmDialog.js";

const timeFormat = new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" });

function summarizeArgs(args) {
  const text = JSON.stringify(args ?? {});
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

function DevControlsPanel() {
  const snapshot = useSyncExternalStore(devConfig.subscribe, devConfig.getSnapshot);
  const [open, setOpen] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  async function resetData() {
    resetAllStoredData();
    try {
      await clearAllImages();
    } catch {
      // IndexedDB unavailable: nothing to clear.
    }
    window.location.reload();
  }

  if (!open) {
    return (
      <button
        type="button"
        className="dev-controls-toggle no-print"
        onClick={() => setOpen(true)}
      >
        Dev controls
      </button>
    );
  }

  return (
    <section className="dev-controls-panel no-print" aria-label="Developer controls">
      <div className="dev-controls-header">
        <strong>Dev controls</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close dev controls"
        >
          ×
        </button>
      </div>

      <div className="dev-controls-grid">
        <label>
          Delay min (ms)
          <input
            type="number"
            min={0}
            value={snapshot.delayMin}
            onChange={(e) =>
              devConfig.setDelay(Number(e.target.value), snapshot.delayMax)
            }
          />
        </label>
        <label>
          Delay max (ms)
          <input
            type="number"
            min={0}
            value={snapshot.delayMax}
            onChange={(e) =>
              devConfig.setDelay(snapshot.delayMin, Number(e.target.value))
            }
          />
        </label>
        <label>
          Failure rate (0 to 1)
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={snapshot.failureRate}
            onChange={(e) => devConfig.setFailureRate(Number(e.target.value))}
          />
        </label>
        <label>
          Search delay max (ms)
          <input
            type="number"
            min={0}
            value={snapshot.searchDelayMax}
            onChange={(e) => devConfig.setSearchDelayMax(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="dev-controls-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => devConfig.resetToDefaults()}
        >
          Reset settings
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setConfirmingReset(true)}
        >
          Reset all stored data
        </button>
      </div>

      <div className="dev-controls-log">
        <div className="dev-controls-log-header">
          <span>Service calls ({snapshot.log.length})</span>
          <button type="button" onClick={() => devConfig.clearLog()}>
            Clear
          </button>
        </div>
        <ol>
          {snapshot.log.map((entry, i) => (
            <li
              key={`${entry.at}-${i}`}
              className={entry.result === "error" ? "dev-log-error" : undefined}
            >
              <span className="dev-log-time">{timeFormat.format(entry.at)}</span>{" "}
              <strong>{entry.name}</strong> {summarizeArgs(entry.args)}
              <br />
              {entry.duration} ms,{" "}
              {entry.result === "ok" ? "ok" : `error ${entry.status}`}
            </li>
          ))}
        </ol>
      </div>

      <ConfirmDialog
        isOpen={confirmingReset}
        title="Reset all stored data?"
        message="Cart, wishlist, orders, reviews, addresses, uploaded images and admin edits are wiped, and the catalogue goes back to the original JSON. The page then reloads."
        confirmLabel="Reset everything"
        onConfirm={resetData}
        onCancel={() => setConfirmingReset(false)}
      />
    </section>
  );
}

/** Rendered only in development; production builds tree-shake it away (docs/specs.md §4.3). */
export const DevControls = import.meta.env.DEV ? DevControlsPanel : () => null;
