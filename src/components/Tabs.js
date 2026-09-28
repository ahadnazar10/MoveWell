import { createContext, useContext, useId, useState } from "react";
import PropTypes from "prop-types";
import styles from "./Tabs.module.css";

const TabsContext = createContext(null);

function useTabsContext(component) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`${component} must be used inside <Tabs>`);
  return context;
}

/**
 * Compound Tabs. <Tab value="x"> and <TabPanel value="x"> are matched by
 * value, not by position, so the page can put the tab list and the panels
 * anywhere inside <Tabs>, in any order, with any wrappers in between.
 *
 * Keyboard (WAI-ARIA tabs pattern, automatic activation): Left/Right move
 * between tabs and wrap, Home/End jump to the first/last, and only the
 * selected tab is in the Tab order.
 */
export function Tabs({
  defaultValue,
  value: controlledValue,
  onChange,
  children,
  className,
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;
  const baseId = useId();

  function select(next) {
    if (controlledValue === undefined) setUncontrolledValue(next);
    onChange?.(next);
  }

  return (
    <TabsContext.Provider value={{ value, select, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, label }) {
  const { select } = useTabsContext("TabList");

  function handleKeyDown(event) {
    const tabs = [
      ...event.currentTarget.querySelectorAll('[role="tab"]:not([disabled])'),
    ];
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;

    const nextIndex = {
      ArrowRight: (current + 1) % tabs.length,
      ArrowLeft: (current - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (nextIndex === undefined) return;

    event.preventDefault();
    tabs[nextIndex].focus();
    select(tabs[nextIndex].dataset.value);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={styles.tabList}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

const tabId = (baseId, value) => `${baseId}-tab-${value}`;
const panelId = (baseId, value) => `${baseId}-panel-${value}`;

export function Tab({ value, children }) {
  const context = useTabsContext("Tab");
  const selected = context.value === value;

  return (
    <button
      id={tabId(context.baseId, value)}
      type="button"
      role="tab"
      data-value={value}
      aria-selected={selected}
      aria-controls={panelId(context.baseId, value)}
      tabIndex={selected ? 0 : -1}
      className={`${styles.tab} ${selected ? styles.selectedTab : ""}`}
      onClick={() => context.select(value)}
    >
      {children}
    </button>
  );
}

export function TabPanel({ value, children }) {
  const context = useTabsContext("TabPanel");
  if (context.value !== value) return null;

  return (
    <div
      id={panelId(context.baseId, value)}
      role="tabpanel"
      aria-labelledby={tabId(context.baseId, value)}
      tabIndex={0}
      className={styles.tabPanel}
    >
      {children}
    </div>
  );
}

Tabs.propTypes = {
  defaultValue: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

TabList.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
};

Tab.propTypes = {
  value: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

TabPanel.propTypes = {
  value: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
