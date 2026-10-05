"use client";

import { useState } from "react";
import { DataState, EmptyRow, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useProperties, useScanners, useUpdateScanner } from "@/features/hr/api";
import type { Property, Scanner } from "@/features/hr/types";

/**
 * Not in the prototype: which property (resort) each SmartAC / ZKTeco scanner
 * stands at, so attendance shows where every scan came from and PINs are
 * matched per property.
 */
export default function ScannersPage() {
  const { t } = useLang();
  const scanners = useScanners();
  const props = useProperties();
  return (
    <div className="dash-wrap">
      <SectionHead title={t("sh_scanners")} />
      <Lede>
        Each scanner belongs to one property. An employee&apos;s Scanner PIN is linked only to the scanners of their own property (plus any
        scanner not assigned yet), so the same PIN can be used by different people at different resorts. New scanners appear here after they
        are registered by Admin.
      </Lede>
      <DataState loading={scanners.isLoading} error={scanners.error}>
        <Table head={["Scanner", "Serial no.", "Property", "Linked PINs", "Last scan", ""]}>
          {(scanners.data ?? []).length === 0 && <EmptyRow cols={6}>No scanners registered yet.</EmptyRow>}
          {scanners.data?.map((s) => (
            <ScannerRow key={s.id} scanner={s} properties={props.data ?? []} />
          ))}
        </Table>
      </DataState>
    </div>
  );
}

function ScannerRow({ scanner, properties }: { scanner: Scanner; properties: Property[] }) {
  const dialogs = useDialogs();
  const update = useUpdateScanner();
  const [label, setLabel] = useState(scanner.label);
  const [propertyId, setPropertyId] = useState(scanner.property_id ?? "");
  const dirty = label !== scanner.label || propertyId !== (scanner.property_id ?? "");

  async function save() {
    try {
      await update.mutateAsync({ id: scanner.id, property_id: propertyId || null, label });
      dialogs.success("Scanner updated", `${label || scanner.serial_no} is now assigned to ${properties.find((p) => p.id === propertyId)?.name ?? "no property"}.`);
    } catch (err) {
      dialogs.error("Could not save", err);
    }
  }

  return (
    <tr>
      <td>
        <input className="inline-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Front gate" />
      </td>
      <td className="mono">{scanner.serial_no}</td>
      <td>
        <select className="inline-input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">— Not assigned —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {!scanner.property_id && (
          <>
            {" "}
            <Tag kind="pending">Unassigned</Tag>
          </>
        )}
      </td>
      <td className="mono">{scanner.linked_pins}</td>
      <td>{scanner.last_scan ?? "—"}</td>
      <td>
        {dirty && (
          <button type="button" className="mini-btn" onClick={save} disabled={update.isPending}>
            Save
          </button>
        )}
      </td>
    </tr>
  );
}
