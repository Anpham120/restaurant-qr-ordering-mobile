import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./operations.css";

export type ConfirmOptions = {
  title: string;
  /** Câu mô tả hậu quả. Nói việc gì sẽ xảy ra, không nói "bạn có chắc không". */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tô đỏ nút xác nhận — dùng cho thao tác phá huỷ. */
  danger?: boolean;
  /**
   * Bắt gõ đúng chuỗi này mới cho bấm xác nhận.
   *
   * Dùng cho thao tác KHÔNG HOÀN TÁC được. Một hộp thoại chỉ có nút "Xoá" thì thao tác xoá nhầm
   * chỉ cách thao tác đúng đúng một cú bấm lệch tay; bắt gõ lại mã bàn hay email khiến người dùng
   * phải ĐỌC xem mình đang xoá cái gì.
   */
  requireText?: string;
  /**
   * Bắt nhập một LÝ DO tự do trước khi cho xác nhận.
   *
   * Khác {@link requireText} — cái đó bắt gõ lại một chuỗi đã biết để buộc người dùng ĐỌC. Cái
   * này thu một câu người dùng tự viết, và câu đó được ghi lại. Dùng cho quyết định cần có tên:
   * ép đóng bàn còn nợ tiền, huỷ một khoản đã thu.
   *
   * Đọc lý do bằng {@link useOpsReason}; {@link useOpsConfirm} vẫn chỉ trả true/false.
   */
  reasonLabel?: string;
  reasonPlaceholder?: string;
};

type YeuCau = ConfirmOptions & { resolve: (lyDo: string | null) => void };

/**
 * Có được phép bấm xác nhận chưa.
 *
 * Tách thành hàm thuần để kiểm được: đây là CƠ CHẾ AN TOÀN của thao tác không hoàn tác, và một cơ
 * chế an toàn không có phép kiểm thì không ai biết nó còn chặn hay không. Kho này chưa có môi
 * trường render component, nên đưa luật ra khỏi JSX là cách duy nhất kiểm nó mà không kéo cả bộ
 * DOM vào.
 *
 * So SÁNH ĐÚNG NGUYÊN VĂN sau khi cắt khoảng trắng hai đầu: không bỏ qua hoa/thường, vì mã bàn
 * `T01` và email là những chuỗi người dùng phải ĐỌC rồi chép lại — chấp nhận `t01` là bỏ đi phần
 * lớn giá trị của việc bắt gõ.
 */
export function chophepXacNhan(requireText: string | undefined, typed: string): boolean {
  if (!requireText) {
    return true;
  }
  return typed.trim() === requireText;
}

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<string | null>) | null>(null);

/**
 * Hộp xác nhận dùng chung, thay cho `confirm()` của trình duyệt.
 *
 * Vì sao bỏ `confirm()`:
 *
 * - Nó **chặn cả luồng JavaScript**. Trong lúc hộp thoại mở, sự kiện realtime không được xử lý —
 *   nên bảng vận hành đứng im, và khi bấm xong thì một loạt cập nhật ập vào cùng lúc.
 * - Không tuỳ biến được: không tô đỏ được thao tác phá huỷ, không bắt gõ xác nhận được, và trên
 *   một số trình duyệt người dùng có thể tick "chặn hộp thoại" — sau đó `confirm()` trả về `false`
 *   im lặng và mọi thao tác xoá lặng lẽ không chạy.
 * - Nó hiện tên miền của trang, trông như cảnh báo của trình duyệt chứ không phải của sản phẩm.
 *
 * API giữ hình dạng cũ để chỗ gọi đổi tối thiểu:
 *
 *     if (!confirm("Xoá?")) return;              // trước
 *     if (!(await confirm({ title: "Xoá?" }))) return;   // sau
 */
export function OpsConfirmProvider({ children }: { children: ReactNode }) {
  const [yeuCau, setYeuCau] = useState<YeuCau | null>(null);
  const [typed, setTyped] = useState("");
  const [lyDo, setLyDo] = useState("");
  const dangCho = useRef<((lyDo: string | null) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    // Giải bằng CHUỖI, không phải boolean: null = huỷ, "" = đồng ý mà không cần lý do. Nhờ vậy
    // useOpsConfirm giữ nguyên hợp đồng cũ (Boolean của null là false) còn useOpsReason đọc được
    // câu người dùng viết — không nơi gọi nào phải sửa.
    return new Promise<string | null>((resolve) => {
      // Nếu có hộp thoại đang mở mà một hộp khác được yêu cầu, đóng cái cũ bằng "huỷ" thay vì bỏ
      // rơi lời hứa của nó — một `await` không bao giờ được giải sẽ treo hàm gọi vĩnh viễn.
      dangCho.current?.(null);
      dangCho.current = resolve;
      setTyped("");
      setLyDo("");
      setYeuCau({ ...options, resolve });
    });
  }, []);

  const dong = useCallback((ok: boolean, lyDoNhap = "") => {
    dangCho.current = null;
    setYeuCau((current) => {
      current?.resolve(ok ? lyDoNhap : null);
      return null;
    });
    setTyped("");
    setLyDo("");
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  const canConfirm = chophepXacNhan(yeuCau?.requireText, typed)
    && (!yeuCau?.reasonLabel || lyDo.trim().length > 0);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {yeuCau ? (
        <div
          className="ops-modal-overlay"
          role="presentation"
          onClick={(event) => {
            // Bấm ra ngoài = huỷ. Chỉ khi bấm đúng lớp phủ, không phải khi bấm trong hộp.
            if (event.target === event.currentTarget) dong(false);
          }}
        >
          <div className="ops-modal" role="alertdialog" aria-modal="true" aria-labelledby="ops-confirm-title">
            <div className="ops-modal-header">
              <h2 id="ops-confirm-title">{yeuCau.title}</h2>
            </div>

            {/*
              DÙNG LẠI `ops-modal-body` / `ops-modal-footer`, KHÔNG TỰ ĐẶT PADDING.

              Hộp này trước đây thả nội dung thẳng vào `.ops-modal` — mà lớp đó KHÔNG có padding,
              nó chỉ bo góc. Header thì tự mang padding riêng, nên nhìn qua vẫn cân; phần thân và
              hàng nút thì dính sát mép, và nút đầu tiên bị góc bo 16px cắt mất một góc.

              Hai lớp có padding đã tồn tại sẵn và modal chi tiết đơn đang dùng chúng. Đặt padding
              riêng cho hộp này là dựng bản thứ hai của cùng một thứ, rồi chờ chúng lệch nhau.
            */}
            <div className="ops-modal-body">
            {yeuCau.message ? <p className="ops-confirm-message">{yeuCau.message}</p> : null}

            {yeuCau.requireText ? (
              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="ops-confirm-input">
                  Gõ <strong>{yeuCau.requireText}</strong> để xác nhận
                </label>
                <input
                  id="ops-confirm-input"
                  className="ops-form-input"
                  autoFocus
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canConfirm) dong(true, lyDo);
                    if (event.key === "Escape") dong(false);
                  }}
                />
              </div>
            ) : null}

            {yeuCau.reasonLabel ? (
              <div className="ops-form-group">
                <label className="ops-form-label" htmlFor="ops-confirm-reason">{yeuCau.reasonLabel}</label>
                <input
                  id="ops-confirm-reason"
                  className="ops-form-input"
                  autoFocus={!yeuCau.requireText}
                  value={lyDo}
                  placeholder={yeuCau.reasonPlaceholder}
                  onChange={(event) => setLyDo(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canConfirm) dong(true, lyDo);
                    if (event.key === "Escape") dong(false);
                  }}
                />
              </div>
            ) : null}

            </div>

            <div className="ops-modal-footer">
              <button
                autoFocus={!yeuCau.requireText}
                className={`ops-btn ${yeuCau.danger ? "ops-btn--danger" : "ops-btn--primary"}`}
                disabled={!canConfirm}
                type="button"
                onClick={() => dong(true, lyDo)}
              >
                {yeuCau.confirmLabel ?? "Xác nhận"}
              </button>
              <button className="ops-btn ops-btn--ghost" type="button" onClick={() => dong(false)}>
                {yeuCau.cancelLabel ?? "Huỷ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

/**
 * Trả về hàm hỏi xác nhận.
 *
 * Ném lỗi khi thiếu provider thay vì lặng lẽ trả `true`: một thao tác xoá chạy mà không hỏi ai là
 * thứ tệ hơn nhiều so với một màn hình lỗi lúc phát triển.
 */
export function useOpsConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useOpsConfirm phải nằm trong <OpsConfirmProvider>.");
  }
  return async (options: ConfirmOptions) => (await ctx(options)) !== null;
}

/**
 * Hỏi xác nhận VÀ thu một lý do. Trả về câu người dùng viết, hoặc `null` khi họ huỷ.
 *
 * Dùng chung đúng một modal với {@link useOpsConfirm} — hai hộp thoại cho hai việc gần giống nhau
 * là hai chỗ để trôi khỏi nhau.
 */
export function useOpsReason() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useOpsReason phải nằm trong <OpsConfirmProvider>.");
  }
  return ctx;
}
