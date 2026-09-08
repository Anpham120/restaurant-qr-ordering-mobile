import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiError } from "@cmc/api-client";
import { api } from "../../services/apiClient";
import { useOpsConfirm } from "../../components/operations/OpsConfirmProvider";
import { docPhut, docTien, tailBanQuaGio, type BanQuaGio } from "../../services/overdueTableService";
import "../../components/operations/operations.css";

/**
 * Bàn ngồi quá giờ mà chưa thu tiền.
 *
 * <p><b>Vì sao màn này tồn tại.</b> Trước đây một bàn quá 4 giờ bị chuyển `Expired` bất kể đã trả
 * tiền chưa, và sau đó nó biến mất khỏi MỌI màn hình: không hoá đơn nào được lập nên danh sách chờ
 * thu trống, còn trung tâm điều hành thì lọc thẳng phiên hết hạn ra. Món đã ăn, không ai được hỏi
 * tiền, và không màn hình nào hiện việc đó. Máy chủ đã sửa — bàn còn nợ được gia hạn thay vì đóng
 * — và đây là chỗ nhìn thấy chúng.
 */
export function CounterOverduePanel() {
  const confirm = useOpsConfirm();
  const [ban, setBan] = useState<BanQuaGio[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangMoLyDo, setDangMoLyDo] = useState<string | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [dangDong, setDangDong] = useState<string | null>(null);

  const tai = useCallback(() => {
    setLoi(null);
    tailBanQuaGio()
      .then(setBan)
      .catch(() => setLoi("Không đọc được danh sách bàn. Thử làm mới."));
  }, []);

  useEffect(() => {
    tai();
    // Quầy bị cắt ngang liên tục nên không ai ngồi bấm làm mới. 60 giây đủ chậm để không tốn băng
    // thông, đủ nhanh để một bàn vừa quá giờ không nằm im hết cả ca.
    const dinhKy = window.setInterval(tai, 60_000);
    return () => window.clearInterval(dinhKy);
  }, [tai]);

  function moOLyDo(sessionId: string) {
    setLoi(null);
    setLyDo("");
    setDangMoLyDo(sessionId);
  }

  async function epDong(muc: BanQuaGio) {
    const noiDung = lyDo.trim();
    if (!noiDung) {
      setLoi("Ép đóng bàn phải kèm lý do.");
      return;
    }

    // Hộp thoại dùng chung, cùng khuôn với chốt ca: nói HẬU QUẢ kèm con số, và bắt gõ lại mã bàn.
    // Gõ lại là để người dùng phải ĐỌC xem mình đang đóng bàn nào — đóng nhầm bàn đang ăn dở là
    // bỏ một khoản tiền, và nó chỉ cách thao tác đúng một cú bấm lệch tay.
    if (!(await confirm({
      title: `Đóng bàn ${muc.tenBan} khi chưa thu tiền?`,
      message: `Bàn còn ${docTien(muc.tienNo)} chưa thu, ${muc.soDonDangMo} đơn, quá giờ `
        + `${docPhut(muc.phutQuaGio)}. Đóng bàn là bỏ khoản này, và lý do sẽ được ghi lại kèm tên bạn.`,
      confirmLabel: "Ép đóng",
      danger: true,
      requireText: muc.tableCode,
    }))) return;

    setDangDong(muc.sessionId);
    try {
      await api.tables.closeSession(muc.sessionId, { force: true, reason: noiDung });
      setDangMoLyDo(null);
      setLyDo("");
      tai();
    } catch (e) {
      setLoi(e instanceof ApiError ? e.message : "Không đóng được bàn.");
    } finally {
      setDangDong(null);
    }
  }

  return (
    <section className="ops-command-widget">
      <div className="ops-command-widget-head">
        <h2><AlertTriangle size={18} /> Bàn quá giờ, chưa thanh toán</h2>
        <button type="button" className="ops-btn ops-btn--sm" onClick={tai}>
          <RefreshCw aria-hidden="true" size={16} /> Làm mới
        </button>
      </div>

      {loi ? <p className="ops-muted" role="alert">{loi}</p> : null}

      {ban === null ? (
        <p className="ops-muted">Đang tải…</p>
      ) : ban.length === 0 ? (
        <p className="ops-muted">Không có bàn nào quá giờ mà chưa thu tiền.</p>
      ) : (
        <ul className="ops-command-list">
          {ban.map((muc) => (
            <li key={muc.sessionId}>
              {/* Danh sách VIỆC, không phải bảng số: tiền đứng trước vì đó là thứ quyết định bàn
                  nào đi đòi trước, và mỗi dòng bấm thẳng sang hoá đơn của bàn đó. */}
              <Link to={`/tables?tab=sessions&table=${encodeURIComponent(muc.tableCode)}`}>
                Bàn {muc.tenBan} · quá giờ {docPhut(muc.phutQuaGio)}
                <small>{docTien(muc.tienNo)} · {muc.soDonDangMo} đơn chưa thanh toán</small>
              </Link>

              {dangMoLyDo === muc.sessionId ? (
                <div className="ops-form-row">
                  <label className="ops-form-label" htmlFor={`ly-do-${muc.sessionId}`}>
                    Lý do đóng bàn khi chưa thu tiền
                  </label>
                  <input
                    id={`ly-do-${muc.sessionId}`}
                    className="ops-form-input"
                    value={lyDo}
                    onChange={(e) => setLyDo(e.target.value)}
                    placeholder="Khách bỏ về, quản lý duyệt miễn…"
                  />
                  <button
                    type="button"
                    className="ops-btn ops-btn--danger ops-btn--sm"
                    disabled={dangDong === muc.sessionId}
                    onClick={() => void epDong(muc)}
                  >
                    {dangDong === muc.sessionId ? "Đang đóng…" : "Ép đóng"}
                  </button>
                  <button
                    type="button"
                    className="ops-btn ops-btn--sm"
                    onClick={() => setDangMoLyDo(null)}
                  >
                    Huỷ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ops-btn ops-btn--sm"
                  onClick={() => moOLyDo(muc.sessionId)}
                >
                  Đóng bàn…
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
