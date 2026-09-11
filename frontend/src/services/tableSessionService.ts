import { ApiError } from "@cmc/api-client";
import { api } from "./apiClient";

type TableSession = Awaited<ReturnType<typeof api.tables.openSession>>;

type ResolvedTableQr = {
  tableCode: string;
  displayName: string;
};

export type OpenDineInSessionResult =
  | { status: "open"; session: TableSession }
  | { status: "expired" }
  | { status: "already_used" }
  | { status: "invalid" }
  | { status: "error" };

export type ValidateDineInSessionResult =
  | { status: "open"; session: Awaited<ReturnType<typeof api.tables.getSession>> }
  | { status: "expired" }
  /** Phiên ĐÃ THANH TOÁN XONG và được đóng, khác hẳn hết hạn. Xem ghi chú ở chỗ trả về. */
  | { status: "settled" }
  | { status: "invalid" }
  | { status: "error" };

export async function openDineInSession(
  qrToken: string,
  tableCode: string,
): Promise<OpenDineInSessionResult> {
  try {
    const session = await api.tables.openSession({ qrToken, tableCode });
    return { status: "open", session };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.code === "QR_ALREADY_USED") {
        return { status: "already_used" };
      }

      if (error.status === 410 || error.code === "TABLE_SESSION_EXPIRED") {
        return { status: "expired" };
      }

      if (
        error.code === "QR_NOT_FOUND" ||
        error.code === "QR_TABLE_MISMATCH" ||
        error.code === "QR_TOKEN_INVALID" ||
        error.status === 404
      ) {
        return { status: "invalid" };
      }
    }

    return { status: "error" };
  }
}

export async function resolveTableQr(qrToken: string): Promise<ResolvedTableQr> {
  return api.request<ResolvedTableQr>(`/tables/qr/${encodeURIComponent(qrToken)}`);
}

export async function validateDineInSession(
  sessionId: string,
  sessionToken: string,
  tableCode: string,
): Promise<ValidateDineInSessionResult> {
  try {
    const session = await api.tables.getSession(sessionId, sessionToken);
    // PHIÊN ĐÃ THANH TOÁN KHÁC PHIÊN HẾT HẠN, và phải giữ riêng.
    //
    // Trước đây mọi trạng thái khác `Open` đều trả về `expired`. Thông tin mất ở đây làm trang
    // đặt món tưởng phiên chỉ hết hạn, nên nó "cứu" bằng cách MỞ MỘT PHIÊN MỚI từ mã QR đã lưu.
    // Hậu quả: khách trả tiền xong, để nguyên tab, làm mới trang một cái là bàn có hoá đơn mới và
    // trông như đang có người ngồi — im lặng, không ai bấm gì.
    //
    // Đo trên máy chủ thật: bàn T01 có phiên đóng lúc 14:30:12 và một phiên mới mở lúc 14:35:15.
    if (session.status === "Closed") {
      return { status: "settled" };
    }
    if (session.status !== "Open" || session.isExpired) {
      return { status: "expired" };
    }
    if (session.tableCode !== tableCode) {
      return { status: "invalid" };
    }
    return { status: "open", session };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 410 || error.code === "TABLE_SESSION_EXPIRED") {
        return { status: "expired" };
      }
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 404 ||
        error.code === "TABLE_SESSION_TOKEN_INVALID" ||
        error.code === "TABLE_SESSION_NOT_FOUND"
      ) {
        return { status: "invalid" };
      }
    }
    return { status: "error" };
  }
}
