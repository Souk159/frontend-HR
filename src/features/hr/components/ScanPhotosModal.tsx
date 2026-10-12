"use client";

import { tr } from "@/lib/i18n";
import { Modal, photoSrc } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import type { Attendance } from "../types";

/**
 * Profile photo beside every face photo the scanner took that day, so HR can
 * check that the person who scanned is the employee (buddy-punching).
 */
export function ScanPhotosModal({ record, onClose }: { record: Attendance | null; onClose: () => void }) {
  const profile = photoSrc(record?.profile_photo_url);
  return (
    <Modal open={!!record} onClose={onClose} wide title={record ? `${record.full_name} — ${fmtDate(record.work_date.slice(0, 10))}` : ""}>
      {record && (
        <div className="photo-compare">
          <figure>
            {profile ? (
              // eslint-disable-next-line @next/next/no-img-element -- session-gated private image
              <img src={profile} alt={`${record.full_name} profile`} />
            ) : (
              <div className="empty-photo">{tr("No profile photo", "ບໍ່ມີຮູບໂປຣໄຟລ໌")}</div>
            )}
            <figcaption>
              <b>{tr("Profile photo", "ຮູບໂປຣໄຟລ໌")}</b>
            </figcaption>
          </figure>
          {record.photos.length === 0 && (
            <figure>
              <div className="empty-photo">{tr("No photo from the scanner", "ບໍ່ມີຮູບຈາກເຄື່ອງສະແກນ")}</div>
              <figcaption>{tr("Scan photo", "ຮູບຕອນສະແກນ")}</figcaption>
            </figure>
          )}
          {record.photos.map((p) => (
            <figure key={p.url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- session-gated private image */}
              <img src={photoSrc(p.url) ?? ""} alt={`${record.full_name} scan ${fmtTime(p.taken_at)}`} />
              <figcaption>
                <b className="mono">{fmtTime(p.taken_at)}</b> · {p.device || "scanner"}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </Modal>
  );
}
