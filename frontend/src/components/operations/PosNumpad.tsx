import { PHIM, bamPhim, nhanPhim } from "./posNumpadKeys";
import "./operations.css";

/**
 * Bàn phím số trên màn cho ô nhập tiền khách đưa.
 *
 * VÌ SAO CẦN, DÙ Ô NHẬP ĐÃ CÓ `inputMode="numeric"`:
 * `inputMode` chỉ gợi ý cho bàn phím ảo của hệ điều hành. Trên điện thoại và tablet nó bật lên
 * đúng; trên một máy POS Windows có màn cảm ứng nhưng KHÔNG bật bàn phím cảm ứng thì không có gì
 * hiện ra, và người thu ngân phải với sang bàn phím vật lý giữa lúc đang cầm tiền của khách.
 *
 * Quầy có màn cảm ứng — đã xác nhận, ghi ở §1.2 của đặc tả.
 *
 * VÌ SAO ẨN/HIỆN BẰNG CSS, KHÔNG BẰNG JAVASCRIPT:
 * Đo bề ngang trong JS cần một `resize` listener và một giá trị ban đầu đoán trước khi trang gắn
 * vào DOM — hai chỗ để lệch với CSS. Bàn phím luôn nằm trong DOM, và một `@media` quyết định nó
 * hiện hay không. Một nguồn sự thật cho một câu hỏi.
 */
export function PosNumpad({
  value,
  onChange,
  ariaLabel = "Bàn phím số",
}: {
  value: string;
  onChange: (giaTriMoi: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="pos-numpad" role="group" aria-label={ariaLabel}>
      {PHIM.flat().map((phim) => (
        <button
          key={phim}
          type="button"
          className={`ops-btn ops-btn--ghost pos-numpad-key${phim === "⌫" ? " pos-numpad-key--erase" : ""}`}
          aria-label={nhanPhim(phim)}
          // `onMouseDown` + `preventDefault` để ô nhập KHÔNG mất tiêu điểm khi bấm phím. Mất tiêu
          // điểm thì con trỏ nhảy và người dùng không gõ tiếp bằng bàn phím vật lý được.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange(bamPhim(value, phim))}
        >
          {phim}
        </button>
      ))}
    </div>
  );
}
