import { useEffect, useId, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import {
  fetchAddresses,
  selectAddresses,
  selectAddressesStatus,
  addAddress,
  editAddress,
  removeAddress,
} from "../../features/addresses/addressesSlice.js";
import { showToast } from "../../features/ui/uiSlice.js";
import { AddressFields } from "../../components/AddressFields.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { emptyAddress } from "../../features/checkout/checkoutReducer.js";
import {
  ADDRESS_FIELDS,
  validateAddress,
} from "../../features/checkout/checkoutValidation.js";
import styles from "./AccountAddresses.module.css";

function AddressForm({ initial, onSave, onCancel, legend }) {
  const idPrefix = useId();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validateAddress(values);
    setErrors(found);
    const first = ADDRESS_FIELDS.find((f) => found[f]);
    if (first) {
      document.getElementById(`${idPrefix}-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSave(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
      <AddressFields
        idPrefix={idPrefix}
        legend={legend}
        values={values}
        errors={errors}
        onChange={(field, value) => {
          setValues((v) => ({ ...v, [field]: value }));
          setErrors((e) => ({ ...e, [field]: undefined }));
        }}
      />
      <div className={styles.formActions}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}

AddressForm.propTypes = {
  initial: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  legend: PropTypes.string.isRequired,
};

/** The same saved addresses checkout offers, managed in one place. */
export function AccountAddresses() {
  const dispatch = useDispatch();
  const addresses = useSelector(selectAddresses);
  const status = useSelector(selectAddressesStatus);
  const [editing, setEditing] = useState(null); // "new" | address id | null
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  async function save(values) {
    try {
      if (editing === "new") {
        await dispatch(addAddress(values)).unwrap();
        dispatch(showToast("Address added", "success"));
      } else {
        await dispatch(editAddress({ id: editing, data: values })).unwrap();
        dispatch(showToast("Address updated", "success"));
      }
      setEditing(null);
    } catch (err) {
      dispatch(showToast(err?.message ?? "Couldn't save the address", "error"));
    }
  }

  async function confirmDelete() {
    const target = toDelete;
    setToDelete(null);
    try {
      await dispatch(removeAddress(target.id)).unwrap();
      dispatch(showToast("Address deleted", "info"));
    } catch (err) {
      dispatch(showToast(err?.message ?? "Couldn't delete the address", "error"));
    }
  }

  return (
    <section aria-labelledby="addresses-heading">
      <div className={styles.headerRow}>
        <h2 id="addresses-heading">Addresses</h2>
        {editing === null && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing("new")}
          >
            <PlusIcon size={16} weight="bold" aria-hidden="true" /> Add address
          </button>
        )}
      </div>

      {editing === "new" && (
        <AddressForm
          initial={emptyAddress}
          legend="New address"
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {status === "loading" && addresses.length === 0 ? (
        <p className="muted" role="status">
          Loading addresses…
        </p>
      ) : status === "failed" ? (
        <div className="empty-state" role="alert">
          <p>Your addresses couldn&apos;t be loaded.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => dispatch(fetchAddresses())}
          >
            Retry
          </button>
        </div>
      ) : addresses.length === 0 && editing !== "new" ? (
        <div className="empty-state">
          <p className="muted">No saved addresses yet. Add one here or at checkout.</p>
        </div>
      ) : (
        <ul className={styles.grid}>
          {addresses.map((addr) =>
            editing === addr.id ? (
              <li key={addr.id} className={styles.wide}>
                <AddressForm
                  initial={addr}
                  legend="Edit address"
                  onSave={save}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={addr.id} className={styles.addressCard}>
                <p className={styles.name}>{addr.name}</p>
                <p className="muted">
                  {addr.address}
                  <br />
                  {addr.city} {addr.pin}
                  <br />
                  {addr.phone}
                  <br />
                  {addr.email}
                </p>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditing(addr.id)}
                  >
                    <PencilSimpleIcon size={16} aria-hidden="true" /> Edit
                    <span className="visually-hidden"> address for {addr.name}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setToDelete(addr)}
                  >
                    <TrashIcon size={16} aria-hidden="true" /> Delete
                    <span className="visually-hidden"> address for {addr.name}</span>
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        title="Delete address?"
        message={
          toDelete ? `Delete the address for ${toDelete.name}? This can't be undone.` : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
