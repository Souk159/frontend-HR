"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

/**
 * EN / ລາວ switch, same behaviour as the prototype's lang toggle.
 * Lao strings are taken from the prototype's `translations.lo` where it had them.
 */
export type Lang = "en" | "lo";

const dict = {
  en: {
    sign_in: "Sign in",
    sign_out: "Sign out",
    login_sub: "Sign in to your workspace",
    username: "Username",
    password: "Password",
    business: "Business code",
    login_note: "Your <b>role</b> and <b>department access</b> are both set by the Admin.",
    hr_pill: "Group — Human Resources",
    tb_employee_directory: "Employee Directory",
    tb_part_time: "Part-time",
    tb_attendance: "Attendance",
    tb_leave_requests: "Leave Requests",
    tb_employee_status: "Employee Status",
    tb_leave_quota: "Leave Quota",
    tb_work_rules: "Work Rules",
    tb_service_charge_bonus: "Service Charge",
    ng_people: "People",
    ng_time: "Time & Leave",
    ng_pay: "Pay",
    ng_settings: "Approvals & Settings",
    menu: "Menu",
    tb_resigned: "Resigned / Final Pay",
    tb_approval_rule: "Approval Rule",
    tb_manual_hours: "Manual Hours Entry",
    tb_cost_labels: "Department Cost Labeling",
    tb_bonus_types: "Bonus Types",
    tb_public_holiday: "Public Holiday",
    tb_meal_quota: "Meal Quota",
    tb_payroll: "Payroll",
    tb_approval_history: "Approval History",
    tb_org_structure: "Organization Structure",
    tb_hr_overview: "HR Overview",
    tb_scanners: "Properties & Scanners",
    tb_hr_approvals: "HR Approvals",
    tb_hr_access: "Manage HR Access",
    sh_employee_directory: "Employee directory",
    sh_part_time: "Part-time",
    sh_attendance_today: "Attendance",
    sh_leave_requests: "Leave requests",
    sh_employee_status: "Employee status",
    sh_leave_quota: "Leave quota",
    sh_work_rules_dept: "Work rules — by department",
    sh_service_charge_bonus: "Service charge",
    sh_resigned: "Resigned / final pay",
    sh_approval_rule: "Approval rule",
    sh_manual_hours: "Manual hours entry",
    sh_cost_labels: "Department cost labeling",
    sh_bonus_types: "Bonus types",
    sh_public_holiday: "Public holiday",
    sh_staff_meal_quota: "Staff meal quota",
    sh_payroll: "Payroll",
    sh_approval_history: "Approval history",
    sh_org_structure: "Organization structure",
    sh_hr_overview: "HR overview",
    sh_pending_hr_approvals: "Pending HR approvals",
    sh_hr_coord_permissions: "HR Coordinator permissions",
    sh_scanners: "Attendance scanners",
    loading: "Loading…",
    save_all: "💾 Save all",
    approve: "Approve",
    deny: "Deny",
    continue: "Continue",
    ok: "OK",
    cancel: "Cancel",
  },
  lo: {
    sign_in: "ເຂົ້າສູ່ລະບົບ",
    sign_out: "ອອກຈາກລະບົບ",
    login_sub: "ເຂົ້າສູ່ບ່ອນເຮັດວຽກຂອງທ່ານ",
    username: "ຊື່ຜູ້ໃຊ້",
    password: "ລະຫັດຜ່ານ",
    business: "ລະຫັດທຸລະກິດ",
    login_note: "<b>ບົດບາດ</b> ແລະ <b>ສິດເຂົ້າເຖິງພະແນກ</b> ຖືກກຳນົດໂດຍ Admin.",
    hr_pill: "ກຸ່ມ — ບຸກຄະລາກອນ",
    tb_employee_directory: "ສາລະບານພະນັກງານ",
    tb_part_time: "ພະນັກງານພາທາມ",
    tb_attendance: "ການເຂົ້າວຽກ",
    tb_leave_requests: "ຄຳຂໍລາພັກ",
    tb_employee_status: "ສະຖານະພະນັກງານ",
    tb_leave_quota: "ໂຄຕາການລາ",
    tb_work_rules: "ກົດລະບຽບການເຮັດວຽກ",
    tb_service_charge_bonus: "ຄ່າບໍລິການ",
    ng_people: "ພະນັກງານ",
    ng_time: "ເວລາ ແລະ ການລາ",
    ng_pay: "ເງິນເດືອນ",
    ng_settings: "ອະນຸມັດ ແລະ ຕັ້ງຄ່າ",
    menu: "ເມນູ",
    tb_resigned: "ລາອອກ / ເງິນສຸດທ້າຍ",
    tb_approval_rule: "ກົດການອະນຸມັດ",
    tb_manual_hours: "ບັນທຶກຊົ່ວໂມງດ້ວຍມື",
    tb_cost_labels: "ປ້າຍຕົ້ນທຶນພະແນກ",
    tb_bonus_types: "ປະເພດໂບນັດ",
    tb_public_holiday: "ວັນພັກລັດຖະການ",
    tb_meal_quota: "ໂຄຕາອາຫານ",
    tb_payroll: "ເງິນເດືອນ",
    tb_approval_history: "ປະຫວັດການອະນຸມັດ",
    tb_org_structure: "ໂຄງສ້າງອົງກອນ",
    tb_hr_overview: "ພາບລວມບຸກຄະລາກອນ",
    tb_scanners: "ຣີສອດ ແລະ ເຄື່ອງສະແກນ",
    tb_hr_approvals: "ອະນຸມັດ HR",
    tb_hr_access: "ຈັດການສິດ HR",
    sh_employee_directory: "ສາລະບານພະນັກງານ",
    sh_part_time: "ພະນັກງານພາທາມ",
    sh_attendance_today: "ການເຂົ້າວຽກ",
    sh_leave_requests: "ຄຳຂໍລາພັກ",
    sh_employee_status: "ສະຖານະພະນັກງານ",
    sh_leave_quota: "ໂຄຕາການລາ",
    sh_work_rules_dept: "ກົດລະບຽບການເຮັດວຽກ — ຕາມພະແນກ",
    sh_service_charge_bonus: "ຄ່າບໍລິການ",
    sh_resigned: "ລາອອກ / ເງິນສຸດທ້າຍ",
    sh_approval_rule: "ກົດການອະນຸມັດ",
    sh_manual_hours: "ບັນທຶກຊົ່ວໂມງດ້ວຍມື",
    sh_cost_labels: "ປ້າຍຕົ້ນທຶນພະແນກ",
    sh_bonus_types: "ປະເພດໂບນັດ",
    sh_public_holiday: "ວັນພັກລັດຖະການ",
    sh_staff_meal_quota: "ໂຄຕາອາຫານພະນັກງານ",
    sh_payroll: "ເງິນເດືອນ",
    sh_approval_history: "ປະຫວັດການອະນຸມັດ",
    sh_org_structure: "ໂຄງສ້າງອົງກອນ",
    sh_hr_overview: "ພາບລວມບຸກຄະລາກອນ",
    sh_pending_hr_approvals: "ການອະນຸມັດບຸກຄະລາກອນທີ່ຄ້າງ",
    sh_hr_coord_permissions: "ສິດຂອງຜູ້ປະສານງານບຸກຄະລາກອນ",
    sh_scanners: "ເຄື່ອງສະແກນເຂົ້າວຽກ",
    loading: "ກຳລັງໂຫຼດ…",
    save_all: "💾 ບັນທຶກທັງໝົດ",
    approve: "ອະນຸມັດ",
    deny: "ປະຕິເສດ",
    continue: "ສືບຕໍ່",
    ok: "ຕົກລົງ",
    cancel: "ຍົກເລີກ",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };
const LangContext = createContext<Ctx | null>(null);

// The chosen language lives in localStorage; useSyncExternalStore reads it
// without a hydration mismatch (the server always renders English first).
const LANG_KEY = "yorsys_lang";
const LANG_EVENT = "yorsys-lang";
function readLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "lo" ? "lo" : "en";
  } catch {
    return "en";
  }
}
function subscribeLang(cb: () => void) {
  window.addEventListener(LANG_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LANG_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore<Lang>(subscribeLang, readLang, () => "en");

  useEffect(() => {
    document.body.classList.toggle("lang-lo", lang === "lo");
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  const t = useCallback((k: TKey) => dict[lang][k] ?? dict.en[k], [lang]);
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

export function LangToggle({ onLight = false }: { onLight?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`lang-toggle${onLight ? " on-light" : ""}`}>
      <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className={lang === "lo" ? "active" : ""} onClick={() => setLang("lo")}>
        ລາວ
      </button>
    </div>
  );
}
