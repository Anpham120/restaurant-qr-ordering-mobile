/**
 * Phiên bàn đang mở.
 *
 * Ánh xạ `TableDtos.OpenTableSessionResponse` của backend Java. Chỉ giữ những trường app dùng —
 * thêm trường "cho đủ" nghĩa là thêm chỗ để hỏng khi backend đổi mà không ai thấy lợi ích.
 */
export interface TableSession {
  readonly sessionId: string;
  readonly tableCode: string;
  readonly tableDisplayName: string;
  readonly status: string;
  /** Giữ ở UTC, dạng ISO-8601 — cùng lý do như `AuthSession.expiresAt`. */
  readonly expiresAt: string;
  readonly isExpired: boolean;
  /** Chìa khoá năng lực cho mọi lời gọi sau của phiên này (`X-Table-Session-Token`). */
  readonly tableSessionToken: string;
  /**
   * Backend đã tính sẵn app nên mở màn nào (V51/V52) — app KHÔNG tự suy lại.
   *
   * Suy lại ở phía client nghĩa là hai nơi cùng quyết định một việc, và chúng sẽ lệch nhau đúng
   * vào lúc khó tái hiện nhất: khách quay lại giữa chừng một đơn đang nấu.
   */
  readonly resumeState: string;
  /**
   * Mã QR đã dùng để mở phiên này.
   *
   * KHÔNG có trong phản hồi của backend — app tự giữ lại thứ chính mình đã gửi. Cần nó vì
   * `POST /api/orders` đòi CẢ `tableCode` LẪN `qrToken` cho đơn tại bàn; thiếu là 400
   * `DINE_IN_TABLE_REQUIRED` hoặc `QR_TOKEN_INVALID`.
   *
   * Phải cất cùng phiên chứ không giữ trong bộ nhớ tạm: khách mở lại app rồi đặt món là luồng
   * bình thường, và lúc đó mã QR đã trôi mất nếu chỉ nằm ở màn hình vào bàn.
   */
  readonly qrToken: string;
}

export function conHieuLuc(phien: TableSession, bayGio: Date): boolean {
  // PHIÊN ĐÃ ĐÓNG KHÔNG CÒN DÙNG ĐƯỢC, dù hạn giờ chưa tới.
  //
  // Máy chủ đóng phiên ngay khi hoá đơn được chốt — kể cả khi webhook ngân hàng tự chốt, tức
  // không ai bấm gì trên máy khách. Phép kiểm cũ chỉ nhìn `expiresAt`, nên sau khi trả tiền xong
  // app vẫn coi phiên là sống cho tới lúc hết hạn: khách quay lại thực đơn, bấm thêm món, rồi
  // nhận lỗi 410 từ máy chủ mà không hiểu vì sao.
  //
  // Trả `false` ở đây là đủ để sửa cả luồng: `TableSessionRepository.khoiPhuc` sẽ XOÁ phiên đã
  // chết rồi trả `null`, và app quay về màn quét QR — đúng việc cần làm sau khi khách trả tiền.
  if (phien.status !== 'Open') return false;

  const han = Date.parse(phien.expiresAt);
  if (Number.isNaN(han)) return false;
  return !phien.isExpired && han > bayGio.getTime();
}

export function tableSessionTuJson(json: unknown): TableSession {
  const o = json as Record<string, unknown>;
  const han = new Date(o.expiresAt as string);
  if (Number.isNaN(han.getTime())) throw new Error('expiresAt không đọc được');
  const tableCode = o.tableCode as string;
  return {
    sessionId: o.sessionId as string,
    tableCode,
    tableDisplayName: typeof o.tableDisplayName === 'string' ? o.tableDisplayName : tableCode,
    status: o.status as string,
    expiresAt: han.toISOString(),
    isExpired: typeof o.isExpired === 'boolean' ? o.isExpired : false,
    tableSessionToken: o.tableSessionToken as string,
    resumeState: typeof o.resumeState === 'string' ? o.resumeState : 'Unknown',
    qrToken: typeof o.qrToken === 'string' ? o.qrToken : '',
  };
}

/** KHÔNG in `tableSessionToken` — cùng lý do như `moTaSession` của phiên đăng nhập. */
export function moTaPhienBan(phien: TableSession): string {
  return `TableSession(${phien.tableCode}, status: ${phien.status}, resumeState: ${phien.resumeState}, expiresAt: ${phien.expiresAt})`;
}
