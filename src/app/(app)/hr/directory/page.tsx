"use client";

import { useMemo, useState } from "react";
import { Avatar, DataState, EmptyRow, Field, Lede, SectionHead, Table, Tag, useDialogs } from "@/components/ui";
import { useLang, tr } from "@/lib/i18n";
import { fmtDate, lak } from "@/lib/format";
import { useDepartments, useMyResort, useProperties, useRequestDepartmentChanges, useStaff } from "@/features/hr/api";
import { EmployeeFormModal } from "@/features/hr/components/EmployeeFormModal";
import { NewDepartmentForm } from "@/features/hr/components/NewDepartmentForm";
import type { Staff } from "@/features/hr/types";
import { batchOutcome, deptLabel, groupByDept, matchesSearch } from "@/features/hr/utils";
import { ResignModal } from "@/features/hr/components/ResignModal";
import { TransferModal } from "@/features/hr/components/TransferModal";

export default function DirectoryPage() {
  const { t } = useLang();
  const dialogs = useDialogs();
  const staff = useStaff();
  const depts = useDepartments();
  const props = useProperties();
  const mine = useMyResort(); // a resort account only ever sees its own resort
  const saveChanges = useRequestDepartmentChanges();

  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [showNewDept, setShowNewDept] = useState(false);
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [resigning, setResigning] = useState<Staff | null>(null);
  const [transferring, setTransferring] = useState<Staff | null>(null);
  // draft quota / base salary per department id
  const [drafts, setDrafts] = useState<Record<string, { quota?: string; base_salary?: string }>>({});

  const visible = useMemo(
    () =>
      (staff.data ?? []).filter((e) => matchesSearch(e, search) && (!propertyId || e.property_id === propertyId)),
    [staff.data, search, propertyId],
  );
  const deptByName = new Map((depts.data ?? []).map((d) => [d.name, d]));
  const groups = groupByDept(visible, (e) => e.department, (depts.data ?? []).map((d) => d.name)).filter(
    ([name, rows]) => rows.length > 0 || !search || name.toLowerCase().includes(search.toLowerCase()),
  );

  async function saveAll() {
    const changes = (depts.data ?? [])
      .map((d) => {
        const dr = drafts[d.id];
        if (!dr) return null;
        const quota = dr.quota !== undefined ? parseInt(dr.quota) || 0 : undefined;
        const base = dr.base_salary !== undefined ? parseFloat(dr.base_salary) || 0 : undefined;
        if ((quota === undefined || quota === d.quota) && (base === undefined || base === d.base_salary)) return null;
        return { department_id: d.id, quota, base_salary: base };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    if (changes.length === 0) return dialogs.error(tr("No change", "ບໍ່ມີການປ່ຽນແປງ"), new Error(tr("No changes to save.", "ບໍ່ມີຫຍັງໃຫ້ບັນທຶກ.")));
    try {
      const r = await saveChanges.mutateAsync(changes);
      setDrafts({});
      dialogs.success(...batchOutcome(r, tr("change(s)", "ການປ່ຽນແປງ")));
    } catch (err) {
      dialogs.error(tr("Could not send requests", "ສົ່ງຄຳຂໍບໍ່ສຳເລັດ"), err);
    }
  }


  return (
    <div className="subview">
      <SectionHead title={t("sh_employee_directory")} />
      <div className="land-row">
        <Field label={tr("Search", "ຄົ້ນຫາ")} grow={2}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Search name, ID, department, position or property...", "ຄົ້ນຫາ ຊື່, ລະຫັດ, ພະແນກ, ຕຳແໜ່ງ ຫຼື ຣີສອດ...")} />
        </Field>
        {!mine && (
          <Field label={tr("Property", "ຣີສອດ")}>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">{tr("All properties (group)", "ທຸກຣີສອດ (ທັງກຸ່ມ)")}</option>
              {props.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <button type="button" className="mini-btn" onClick={() => setShowNewDept((v) => !v)}>
          {tr("+ Create department", "+ ສ້າງພະແນກ")}
        </button>
        <button type="button" className="submit-btn" onClick={saveAll} disabled={saveChanges.isPending}>
          {t("save_all")}
        </button>
        <button type="button" className="submit-btn" onClick={() => setEditing("new")}>
          {tr("+ Add new employee", "+ ເພີ່ມພະນັກງານໃໝ່")}
        </button>
      </div>

      {showNewDept && <NewDepartmentForm onDone={() => setShowNewDept(false)} />}

      <DataState loading={staff.isLoading || depts.isLoading} error={staff.error || depts.error}>
        {groups.length === 0 && <p className="empty">{tr("No departments yet — create one above; it becomes usable once approved.", "ຍັງບໍ່ມີພະແນກ — ສ້າງຢູ່ເທິງ; ໃຊ້ໄດ້ເມື່ອອະນຸມັດແລ້ວ.")}</p>}
        {groups.map(([name, rows]) => {
          const d = deptByName.get(name);
          const dr = d ? drafts[d.id] ?? {} : {};
          return (
            <div className="card" key={name}>
              <h3 className="card-head">
                <span>{deptLabel(name)}</span>
                {d && (
                  <span className="meta">
                    {tr("Filled", "ມີແລ້ວ")} {d.filled} / {tr("Quota", "ໂຄຕາ")}
                    <input
                      className="inline-input"
                      style={{ width: 48, textAlign: "center" }}
                      value={dr.quota ?? String(d.quota)}
                      onChange={(e) => setDrafts((p) => ({ ...p, [d.id]: { ...p[d.id], quota: e.target.value } }))}
                    />
                    &nbsp;·&nbsp;{tr("Base/min salary", "ເງິນເດືອນພື້ນຖານ")} ₭
                    <input
                      className="inline-input"
                      style={{ width: 100, textAlign: "right" }}
                      value={dr.base_salary ?? String(d.base_salary)}
                      onChange={(e) => setDrafts((p) => ({ ...p, [d.id]: { ...p[d.id], base_salary: e.target.value } }))}
                    />
                    <span title={tr("Used to calculate this department's quota bonus", "ໃຊ້ຄິດໂບນັດໂຄຕາຂອງພະແນກ")}>ⓘ</span>
                  </span>
                )}
              </h3>
              <Table head={[tr("ID", "ລະຫັດ"), tr("Name", "ຊື່"), tr("Position", "ຕຳແໜ່ງ"), tr("Property", "ຣີສອດ"), tr("Hire date", "ວັນເຂົ້າວຽກ"), tr("Base salary", "ເງິນເດືອນ"), tr("Last salary change", "ປັບເງິນເດືອນລ່າສຸດ"), tr("Scanner PIN", "PIN ສະແກນ"), tr("Status", "ສະຖານະ"), ""]}>
                {rows.length === 0 && <EmptyRow cols={10}>{tr("No employees in this department yet.", "ພະແນກນີ້ຍັງບໍ່ມີພະນັກງານ.")}</EmptyRow>}
                {rows.map((e) => (
                  <tr key={e.user_id}>
                    <td className="mono">{e.employee_no || "—"}</td>
                    <td>
                      <span className="person">
                        <Avatar name={e.full_name} url={e.photo_url || e.device_photo_url} size={36} onClick={() => setEditing(e)} />
                        <span>
                          {e.full_name}
                          {e.name_lao && <div className="hint">{e.name_lao}</div>}
                        </span>
                      </span>
                    </td>
                    <td>{e.position || "—"}</td>
                    <td>{e.property || "—"}</td>
                    <td>{fmtDate(e.hire_date)}</td>
                    <td className="mono">{lak(e.base_salary)}</td>
                    <td>{fmtDate(e.last_salary_change)}</td>
                    <td className="mono">{e.scanner_pin || <span className="c-soft">—</span>}</td>
                    <td>{e.status === "on_leave" ? <Tag kind="pending">{tr("On leave", "ລາພັກ")}</Tag> : <Tag kind="ok">{tr("Active", "ເຮັດວຽກ")}</Tag>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button type="button" className="mini-btn" onClick={() => setEditing(e)}>
                        {tr("Edit", "ແກ້ໄຂ")}
                      </button>
                      <button type="button" className="mini-btn" onClick={() => setTransferring(e)}>
                        {tr("Transfer", "ຍ້າຍ")}
                      </button>
                      <button type="button" className="mini-btn flag" onClick={() => setResigning(e)}>
                        {tr("Resignation", "ລາອອກ")}
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          );
        })}
      </DataState>
      <Lede>
        {tr(
          tr("Quota and base salary above are the only things editable directly on this page — everything else about an employee goes through Edit, and goes through the Approval Rule. Adding a new employee is immediate.", "ໂຄຕາ ແລະ ເງິນເດືອນພື້ນຖານ ແມ່ນສິ່ງດຽວທີ່ແກ້ໄດ້ໂດຍກົງໃນໜ້ານີ້ — ຂໍ້ມູນອື່ນແກ້ຜ່ານປຸ່ມ ແກ້ໄຂ ແລະ ຕ້ອງຜ່ານການອະນຸມັດ. ການເພີ່ມພະນັກງານໃໝ່ມີຜົນທັນທີ."),
          "ໂຄຕາ ແລະ ເງິນເດືອນພື້ນຖານຂ້າງເທິງ ແມ່ນສິ່ງດຽວທີ່ແກ້ໄດ້ໂດຍກົງໃນໜ້ານີ້ — ຂໍ້ມູນອື່ນຂອງພະນັກງານ ແກ້ຜ່ານປຸ່ມ ແກ້ໄຂ ແລະ ຕ້ອງຜ່ານການອະນຸມັດ. ການເພີ່ມພະນັກງານໃໝ່ມີຜົນທັນທີ.",
        )}
      </Lede>

      <EmployeeFormModal editing={editing} onClose={() => setEditing(null)} />
      <ResignModal employee={resigning} onClose={() => setResigning(null)} />
      <TransferModal employee={transferring} onClose={() => setTransferring(null)} />
    </div>
  );
}
