import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Package, RefreshCw } from "lucide-react";
import type { AdminMenuItem } from "../../types";
import { fetchAdminMenuItems, luuThucDonHomNay } from "../../services/adminMenuService";
import { tinhThayDoi, type NhapChuanBi } from "./chuanBiThucDon";
import { useOpsConfirm } from "../operations/OpsConfirmProvider";
import "../operations/operations.css";

/**
 * CHUẨN BỊ THỰC ĐƠN HÔM NAY — việc quản trị viên làm mỗi sáng trước giờ mở cửa.
 *
 * <p>Hai quyết định đi cùng nhau, cho từng món: hôm nay CÓ bán không, và nguyên liệu vừa nhập làm
 * được MẤY SUẤT.
 *
 * <p><b>Vì sao là một bảng chứ không phải modal.</b> Sửa từng món qua hộp thoại là hình dạng đúng
 * cho việc đổi giá hay đổi mô tả — vài lần một năm, mỗi lần một món. Nó là hình dạng SAI cho một
 * việc chạm vào cả thực đơn mỗi ngày: 91 lần mở-gõ-lưu-đóng thì không ai làm, và đó chính là lý do
 * ô "số suất" nằm im từ lúc được thêm vào.
 *
 * <p><b>Ô nhập điền sẵn giá trị đang có.</b> Phần lớn buổi sáng giống hôm qua, nên người dùng chỉ
 * sửa những gì khác. Bắt gõ lại 91 con số mỗi ngày là cách chắc chắn để tính năng bị bỏ.
 */
export function ChuanBiThucDonPanel() {
  const confirm = useOpsConfirm();
  const [mon, setMon] = useState<AdminMenuItem[]>([]);
  const [nhap, setNhap] = useState<Record<string, NhapChuanBi>>({});
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [tim, setTim] = useState("");

  const tai = useCallback(async () => {
    try {
      const ds = await fetchAdminMenuItems();
      setMon(ds);
      setNhap(Object.fromEntries(ds.map((m) => [
        m.id,
        { isAvailable: m.isAvailable, soSuat: m.remainingQuantity == null ? "" : String(m.remainingQuantity) },
      ])));
      setLoi("");
    } catch {
      setLoi("Không tải được thực đơn.");
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  const hienThi = useMemo(() => {
    const q = tim.trim().toLowerCase();
    return q ? mon.filter((m) => m.name.toLowerCase().includes(q)) : mon;
  }, [mon, tim]);

  /**
   * Chỉ gửi những món THẬT SỰ đổi.
   *
   * Gửi cả 91 món thì máy chủ phải đọc và so từng cái, và bản ghi nào cũng bị chạm `updated_at` —
   * bảng bếp sẽ trông như cả thực đơn vừa thay đổi trong khi không có gì đổi.
   */
  const thayDoi = useMemo(() => tinhThayDoi(mon, nhap), [mon, nhap]);

  const soTat = useMemo(() => Object.values(nhap).filter((n) => !n.isAvailable).length, [nhap]);

  async function luu() {
    if (thayDoi.length === 0) return;
    // Xác nhận vì đây là thao tác chạm vào CẢ thực đơn khách đang nhìn, không phải một món.
    const dong = await confirm({
      title: `Áp dụng thực đơn hôm nay?`,
      message: `${thayDoi.length} món thay đổi. Khách sẽ thấy ngay sau khi lưu.`,
      confirmLabel: "Áp dụng",
    });
    if (!dong) return;

    setDangLuu(true);
    setThongBao("");
    try {
      const kq = await luuThucDonHomNay(thayDoi);
      setThongBao(`Đã áp dụng ${kq.daSua} món cho hôm nay.`);
      await tai();
    } catch {
      setLoi("Không lưu được. Chưa món nào thay đổi — thử lại.");
    } finally {
      setDangLuu(false);
    }
  }

  if (dangTai) {
    return <div className="ops-empty"><div className="ops-empty-icon"><Package aria-hidden="true" /></div>Đang tải...</div>;
  }

  return (
    <div>
      {loi ? <div className="ops-notice ops-notice--danger">{loi}</div> : null}
      {thongBao ? <div className="ops-notice ops-notice--info">{thongBao}</div> : null}

      <div className="ops-stats">
        <div className="ops-stat-card">
          <div className="ops-stat-label">Món bán hôm nay</div>
          <div className="ops-stat-value">{mon.length - soTat}</div>
          <div className="ops-stat-detail">trên tổng {mon.length}</div>
        </div>
        <div className="ops-stat-card">
          <div className="ops-stat-label">Tạm tắt</div>
          <div className="ops-stat-value">{soTat}</div>
          <div className="ops-stat-detail">không hiện cho khách</div>
        </div>
        <div className="ops-stat-card">
          <div className="ops-stat-label">Đang chờ lưu</div>
          <div className="ops-stat-value">{thayDoi.length}</div>
          <div className="ops-stat-detail">món đã sửa</div>
        </div>
      </div>

      <div className="ops-toolbar">
        <div className="ops-toolbar-search">
          <input
            className="ops-form-input"
            placeholder="Tìm theo tên món..."
            value={tim}
            onChange={(e) => setTim(e.target.value)}
          />
        </div>
        <button className="ops-btn ops-btn--ghost" onClick={() => void tai()} type="button">
          <RefreshCw aria-hidden="true" size={15} /> Tải lại
        </button>
        <button
          className="ops-btn ops-btn--primary"
          disabled={dangLuu || thayDoi.length === 0}
          onClick={() => void luu()}
          type="button"
        >
          <Check aria-hidden="true" size={15} />
          {thayDoi.length === 0 ? "Chưa có thay đổi" : `Áp dụng ${thayDoi.length} món`}
        </button>
      </div>

      <table className="ops-table">
        <thead>
          <tr>
            <th>Món</th>
            <th>Danh mục</th>
            <th>Bán hôm nay</th>
            <th>Số suất</th>
          </tr>
        </thead>
        <tbody>
          {hienThi.map((m) => {
            const n = nhap[m.id];
            if (!n) return null;
            return (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td className="ops-note">{m.categoryName}</td>
                <td>
                  <button
                    className={`ops-toggle-switch ${n.isAvailable ? "ops-toggle-switch--on" : ""}`}
                    onClick={() => setNhap((p) => ({ ...p, [m.id]: { ...n, isAvailable: !n.isAvailable } }))}
                    type="button"
                    aria-label={`${n.isAvailable ? "Tắt" : "Bật"} ${m.name}`}
                  />
                </td>
                <td>
                  <input
                    className="ops-form-input chuan-bi-so-suat"
                    type="number"
                    min={0}
                    value={n.soSuat}
                    onChange={(e) => setNhap((p) => ({ ...p, [m.id]: { ...n, soSuat: e.target.value } }))}
                    placeholder="Không giới hạn"
                    aria-label={`Số suất ${m.name}`}
                  />
                </td>
              </tr>
            );
          })}
          {hienThi.length === 0 ? (
            <tr><td colSpan={4}><div className="ops-empty">Không tìm thấy món nào.</div></td></tr>
          ) : null}
        </tbody>
      </table>

      <p className="ops-form-hint">
        Để trống ô số suất nghĩa là <strong>không đếm suất</strong> — món bán thoải mái. Gõ số là
        giới hạn suất hôm nay; về 0 thì món tự ẩn khỏi thực đơn khách, và công tắc bên trái
        <strong> không</strong> bị đụng tới. Hai thứ đó tách nhau có chủ ý: "bán hết mẻ" và "hôm nay
        không bán" là hai chuyện khác nhau, và báo cáo cần phân biệt được.
      </p>
    </div>
  );
}
