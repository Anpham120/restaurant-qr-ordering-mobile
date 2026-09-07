import type { AdminTableSessionSummary } from "@cmc/shared-types";
import { api } from "./apiClient";

export type BanQuaGio = {
  sessionId: string;
  tableCode: string;
  tenBan: string;
  quaGioTu: string;
  phutQuaGio: number;
  soDonDangMo: number;
};

/**
 * Bàn ngồi quá giờ mà vẫn còn tiền chưa thu.
 *
 * <p>Lọc theo `overdueSince` chứ KHÔNG theo `isExpired` hay `expiresAt`. Máy chủ nay không cho một
 * phiên còn nợ tiền hết hạn nữa — nó gia hạn thay vì đóng — nên `expiresAt` của những bàn này bị
 * đẩy về tương lai liên tục và luôn trông như bình thường. `overdueSince` giữ mốc hết hạn GỐC và
 * là thứ duy nhất còn nói được "bàn này quá giờ từ bao giờ".
 *
 * <p>Cũ nhất lên đầu: đây là danh sách việc phải làm, và bàn nợ lâu nhất là bàn dễ mất tiền nhất.
 */
export function locBanQuaGio(
  items: AdminTableSessionSummary[],
  bayGio: number,
): BanQuaGio[] {
  return items
    .filter((s) => s.status === "Open" && !!s.overdueSince)
    .map((s) => ({
      sessionId: s.sessionId,
      tableCode: s.tableCode,
      tenBan: s.tableDisplayName ?? s.tableCode,
      quaGioTu: s.overdueSince!,
      phutQuaGio: Math.max(0, Math.floor((bayGio - Date.parse(s.overdueSince!)) / 60000)),
      soDonDangMo: s.activeOrderCount,
    }))
    .sort((a, b) => Date.parse(a.quaGioTu) - Date.parse(b.quaGioTu));
}

/** "2 giờ 15 phút" — người ở quầy đọc bằng mắt, không nhẩm từ 135. */
export function docPhut(phut: number): string {
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio} giờ` : `${gio} giờ ${du} phút`;
}

export async function tailBanQuaGio(bayGio = Date.now()): Promise<BanQuaGio[]> {
  const { items } = await api.tables.listAdminSessions("Open");
  return locBanQuaGio(items, bayGio);
}
