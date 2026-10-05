"use client";

import { useMemo, useState } from "react";
import { Avatar, DataState, EmptyRow, Field, Lede, SectionHead, Table, Tag, photoSrc } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { fmtDate, fmtTime, hoursBetween, num, today } from "@/lib/format";
import { useAttendance, useDepartments, useProperties, useStaff } from "@/features/hr/api";
import type { Attendance } from "@/features/hr/types";
import { groupByDept } from "@/features/hr/utils";
import { ScanPhotosModal } from "@/features/hr/components/ScanPhotosModal";

type Row = Attendance & { missing?: boolean };

export default function AttendancePage() {
  const { t } = useLang();
  const [date, setDate] = useState(today());
  const [propertyId, setPropertyId] = useState("");
  const att = useAttendance(date);
  const depts = useDepartments();
  const staff = useStaff();
  const props = useProperties();
  const [viewing, setViewing] = useState<Row | null>(null);

  const rows: Row[] = useMemo(() => {
    const recs: Row[] = (att.data ?? []).map((r) => ({
      ...r,
      // rows recorded before every scan photo was kept only have attendance.photo_url
      photos: r.photos?.length ? r.photos : r.photo_url ? [{ url: r.photo_url, taken_at: r.check_in ?? r.check_out ?? "", device: r.check_in_device }] : [],
    }));
    // active employees with no scan at all that day
    const seen = new Set(recs.map((r) => r.user_id));
    for (const s of staff.data ?? []) {
      if (s.status !== "active" || seen.has(s.user_id)) continue;
      recs.push({
        id: s.user_id, user_id: s.user_id, full_name: s.full_name, work_date: date, check_in: null, check_out: null,
        status: "", overtime_hrs: 0, note: "", photo_url: "", position: s.position, check_in_device: "", check_out_device: "",
        scan_property_id: null, scan_property: "", home_property_id: s.property_id, home_property: s.property,
        department_id: s.department_id, department: s.department, at_other_property: false, missing: true,
        photos: [], profile_photo_url: s.photo_url || s.device_photo_url,
      });
    }
    return recs.filter((r) => !propertyId || r.scan_property_id === propertyId || r.home_property_id === propertyId);
  }, [att.data, staff.data, date, propertyId]);

  const std = new Map((depts.data ?? []).map((d) => [d.name, d.hours_per_day]));
  const groups = groupByDept(rows, (r) => r.department, (depts.data ?? []).map((d) => d.name)).filter(([, r]) => r.length > 0);

  return (
    <div className="subview">
      <SectionHead title={`${t("sh_attendance_today")} — ${fmtDate(date)}`} />
      <div className="land-row">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </Field>
        <Field label="Property">
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">All properties (group)</option>
            {props.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Lede>
        Tap a photo to compare the profile photo with the face photos the scanner took.{" "}
        <span className="c-clay bold">Red</span> = under that department&apos;s standard hours for the day.{" "}
        <span className="c-moss bold">Green</span> = on time or overtime, with OT hours shown. Each time shows the scanner (and property) that
        recorded it.
      </Lede>
      <DataState loading={att.isLoading || staff.isLoading} error={att.error || staff.error}>
        {groups.length === 0 && <p className="empty">No attendance for {fmtDate(date)}.</p>}
        {groups.map(([dept, recs]) => {
          const standard = std.get(dept) ?? 8;
          return (
            <div className="card" key={dept}>
              <h3 style={{ fontSize: 14 }}>{dept}</h3>
              <Table head={["Name", "Home property", "Clock in", "Clock out", "Scan photos", "Hours today", "OT hours", "Status"]}>
                {recs.length === 0 && <EmptyRow cols={8}>—</EmptyRow>}
                {recs.map((r) => {
                  const hours = hoursBetween(r.check_in, r.check_out);
                  const ot = Math.max(0, hours - standard);
                  const under = hours > 0 && hours < standard;
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="person">
                          <Avatar name={r.full_name} url={r.profile_photo_url} size={34} onClick={() => setViewing(r)} />
                          {r.full_name}
                        </span>
                      </td>
                      <td>{r.home_property || "—"}</td>
                      <td className="mono">
                        {fmtTime(r.check_in)}
                        {r.check_in_device && <div className="hint">{r.check_in_device}</div>}
                      </td>
                      <td className="mono">
                        {fmtTime(r.check_out)}
                        {r.check_out_device && <div className="hint">{r.check_out_device}</div>}
                      </td>
                      <td>
                        {r.photos.length === 0 ? (
                          <span className="c-soft">—</span>
                        ) : (
                          <span className="scan-thumbs">
                            {r.photos.slice(0, 3).map((p) => (
                              <button key={p.url} type="button" className="scan-thumb" onClick={() => setViewing(r)} title={`${fmtTime(p.taken_at)} · ${p.device}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- session-gated private image */}
                                <img src={photoSrc(p.url) ?? ""} alt={`scan ${fmtTime(p.taken_at)}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
                              </button>
                            ))}
                            {r.photos.length > 3 && <span className="hint">+{r.photos.length - 3}</span>}
                          </span>
                        )}
                      </td>
                      <td className={`mono bold ${under ? "c-clay" : "c-moss"}`}>
                        {r.check_in && r.check_out ? `${num(hours)}h / ${num(standard)}h` : "—"}
                      </td>
                      <td className={`mono ${ot > 0 ? "c-moss bold" : ""}`}>{ot > 0 ? `${num(ot)}h` : "—"}</td>
                      <td>
                        {r.missing ? (
                          <Tag kind="muted">No scan</Tag>
                        ) : !r.check_in ? (
                          <Tag kind="low">No check-in scan</Tag>
                        ) : r.check_out ? (
                          <Tag kind="ok">Completed</Tag>
                        ) : (
                          <Tag kind="ok">On shift</Tag>
                        )}{" "}
                        {r.at_other_property && <Tag kind="pending">Scanned at {r.scan_property}</Tag>}
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          );
        })}
      </DataState>
      <ScanPhotosModal record={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
