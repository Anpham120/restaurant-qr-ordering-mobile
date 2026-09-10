import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Package, RefreshCw } from "lucide-react";
import type { AdminMenuItem } from "../../types";
import {
  fetchAdminMenuItems, fetchCaPhucVu, fetchGanCaTheoMon, luuThucDonHomNay, type CaPhucVu,
} from "../../services/adminMenuService";
import {
  caDangMo, caKhacNhau, gioNgan, gioQuanHienTai, locTheoCa, monHetSuatTrongCa, tinhThayDoi,
  type LocCa, type NhapChuanBi,
} from "./chuanBiThucDon";
import { useOpsConfirm } from "../operations/OpsConfirmProvider";
import "../operations/operations.css";

/**
 * CHUẨN BỊ THỰC ĐƠN HÔM NAY — việc quản trị viên làm mỗi sáng trước giờ mở cửa.
 *
 * Ba quyết định đi cùng nhau, cho từng món: hôm nay CÓ bán không, nguyên liệu vừa nhập làm được
 * MẤY SUẤT, và bán vào CA nào.
 *
 * Vì sao là một bảng chứ không phải modal: sửa từng món qua hộp thoại là hình dạng đúng cho việc
 * đổi giá hay đổi mô tả — vài lần một năm, mỗi lần một món. Nó là hình dạng SAI cho một việc chạm
 * vào cả thực đơn mỗi ngày: 91 lần mở-gõ-lưu-đóng thì không ai làm, và đó chính là lý do ô "số
 * suất" nằm im từ lúc được thêm vào.
 *
 * Ô nhập điền sẵn giá trị đang có, vì phần lớn buổi sáng giống hôm qua nên người dùng chỉ sửa
 * những gì khác. Bắt gõ lại 91 con số mỗi ngày là cách chắc chắn để tính năng bị bỏ.
 */
export function ChuanBiThucDonPanel() {
  const confirm = useOpsConfirm();
  const [mon, setMon] = useState<AdminMenuItem[]>([]);
  const [ca, setCa] = useState<CaPhucVu[]>([]);
  const [caBanDau, setCaBanDau] = useState<Record<string, string[]>>({});
  const [nhap, setNhap] = useState<Record<string, NhapChuanBi>>({});
  const [dangTai, setDangTai] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [tim, setTim] = useState("");
  const [locCa, setLocCa] = useState<LocCa>(null);

  /**
   * Chốt một lần lúc mở màn hình. Đọc đồng hồ trong lúc vẽ sẽ làm cảnh báo nhảy giữa chừng khi
   * một ca vừa đóng — người đang gõ dở bỗng thấy nội dung đổi dưới tay mình.
   */
  const [gioMoMan] = useState(() => gioQuanHienTai());

  const tai = useCallback(async () => {
    try {
      const [ds, dsCa, gan] = await Promise.all([
        fetchAdminMenuItems(), fetchCaPhucVu(), fetchGanCaTheoMon(),
      ]);
      setMon(ds);
      setCa(dsCa);
      setCaBanDau(gan);
      setNhap(Object.fromEntries(ds.map((m) => [
        m.id,
        {
          isAvailable: m.isAvailable,
          soSuat: m.remainingQuantity == null ? "" : String(m.remainingQuantity),
          caIds: gan[m.id] ?? [],
        },
      ])));
      setLoi("");
    } catch {
      setLoi("Không tải được thực đơn.");
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  /**
   * Lọc theo ca để tìm nhanh món của ca sắp mở — trước giờ mở cửa buổi tối, người nhập chỉ quan
   * tâm món buổi tối chứ không phải cả 91 dòng.
   *
   * Món bán cả ngày LUÔN nằm trong mọi ca; xem locTheoCa.
   */
  const hienThi = useMemo(() => {
    const theoCa = locTheoCa(mon, caBanDau, locCa);
    const q = tim.trim().toLowerCase();
    return q ? theoCa.filter((m) => m.name.toLowerCase().includes(q)) : theoCa;
  }, [mon, tim, caBanDau, locCa]);

  /**
   * CẢNH BÁO MÓN ĐANG ẨN KHỎI THỰC ĐƠN KHÁCH.
   *
   * Số suất không tự nạp lại khi sang ca mới, có chủ ý: số suất làm được phụ thuộc nguyên liệu
   * nhập sáng hôm đó, và một con số cấu hình sẵn thì không biết hôm nay giao thiếu.
   *
   * Đổi lại, món bán hết mẻ trưa sẽ vẫn khoá tới tối nếu không ai nhập lại. Dải này nói ra điều
   * đó, và nó suy từ dữ liệu đang có — không có bảng nào ghi "ca này đã nhập chưa".
   */
  const canhBao = useMemo(() => {
    return caDangMo(ca, gioMoMan)
      .map((c) => ({ ca: c, mon: monHetSuatTrongCa(mon, caBanDau, c.id) }))
      .filter((x) => x.mon.length > 0);
  }, [ca, gioMoMan, mon, caBanDau]);

  /**
   * Chỉ gửi những món THẬT SỰ đổi.
   *
   * Gửi cả 91 món thì máy chủ phải đọc và so từng cái, và bản ghi nào cũng bị chạm updated_at —
   * bảng bếp sẽ trông như cả thực đơn vừa thay đổi trong khi không có gì đổi.
   */
  const thayDoi = useMemo(() => tinhThayDoi(mon, nhap, caBanDau), [mon, nhap, caBanDau]);

  const soTat = useMemo(() => Object.values(nhap).filter((n) => !n.isAvailable).length, [nhap]);
  const soTheoCa = useMemo(
    () => Object.values(nhap).filter((n) => n.caIds.length > 0).length,
    [nhap],
  );

  function doiCa(monId: string, caId: string) {
    setNhap((p) => {
      const n = p[monId];
      if (!n) return p;
      const co = n.caIds.includes(caId);
      const moi = co ? n.caIds.filter((x) => x !== caId) : [...n.caIds, caId];
      return { ...p, [monId]: { ...n, caIds: moi } };
    });
  }

  async function luu() {
    if (thayDoi.length === 0) return;
    // Xác nhận vì đây là thao tác chạm vào CẢ thực đơn khách đang nhìn, không phải một món.
    const dong = await confirm({
      title: "Áp dụng thực đơn hôm nay?",
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
    return (
      <div className="ops-empty">
        <div className="ops-empty-icon"><Package aria-hidden="true" /></div>
        Đang tải...
      </div>
    );
  }

  return (
    <div>
      {loi ? <div className="ops-notice ops-notice--danger">{loi}</div> : null}
      {thongBao ? <div className="ops-notice ops-notice--info">{thongBao}</div> : null}

      {canhBao.map(({ ca: c, mon: het }) => (
        <div className="ops-notice ops-notice--warning" key={c.id}>
          Ca <strong>{c.name}</strong> ({gioNgan(c.startTime)}–{gioNgan(c.endTime)}) đang mở, nhưng
          {" "}<strong>{het.length} món</strong> của ca đã hết suất nên không hiện cho khách:
          {" "}{het.slice(0, 5).map((m) => m.name).join(", ")}
          {het.length > 5 ? ` và ${het.length - 5} món nữa` : ""}.
          {" "}Nhập lại số suất ở bảng dưới để mở lại.
        </div>
      ))}

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
          <div className="ops-stat-label">Bán theo ca</div>
          <div className="ops-stat-value">{soTheoCa}</div>
          <div className="ops-stat-detail">còn lại bán cả ngày</div>
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
        {ca.length > 0 ? (
          <div className="chuan-bi-ca">
            <button
              type="button"
              className={`chuan-bi-ca-chip ${locCa === null ? "chuan-bi-ca-chip--chon" : ""}`}
              onClick={() => setLocCa(null)}
              aria-pressed={locCa === null}
            >
              Cả thực đơn
            </button>
            {ca.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chuan-bi-ca-chip ${locCa === c.id ? "chuan-bi-ca-chip--chon" : ""}`}
                onClick={() => setLocCa(c.id)}
                aria-pressed={locCa === c.id}
                title={`${gioNgan(c.startTime)}–${gioNgan(c.endTime)}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : null}
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
            <th>Ca phục vụ</th>
          </tr>
        </thead>
        <tbody>
          {hienThi.map((m) => {
            const n = nhap[m.id];
            if (!n) return null;
            const doiCaRoi = caKhacNhau(n.caIds, caBanDau[m.id] ?? []);
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
                <td>
                  {ca.length === 0 ? (
                    <span className="ops-note">Chưa khai ca nào</span>
                  ) : (
                    <div className="chuan-bi-ca">
                      {ca.map((c) => {
                        const chon = n.caIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`chuan-bi-ca-chip ${chon ? "chuan-bi-ca-chip--chon" : ""}`}
                            onClick={() => doiCa(m.id, c.id)}
                            aria-pressed={chon}
                            title={`${gioNgan(c.startTime)}–${gioNgan(c.endTime)}`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                      {/* Không chọn ca nào là một trạng thái CÓ NGHĨA, nên phải nói ra thành chữ.
                          Một ô trống trông giống hệt "chưa cấu hình xong". */}
                      {n.caIds.length === 0 ? <span className="ops-note">cả ngày</span> : null}
                      {doiCaRoi ? <span className="chuan-bi-ca-doi">đã sửa</span> : null}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {hienThi.length === 0 ? (
            <tr><td colSpan={5}><div className="ops-empty">Không tìm thấy món nào.</div></td></tr>
          ) : null}
        </tbody>
      </table>

      <p className="ops-form-hint">
        Để trống ô số suất nghĩa là <strong>không đếm suất</strong> — món bán thoải mái. Gõ số là
        giới hạn suất hôm nay; về 0 thì món tự ẩn khỏi thực đơn khách, và công tắc bên trái
        <strong> không</strong> bị đụng tới. Hai thứ đó tách nhau có chủ ý: "bán hết mẻ" và "hôm nay
        không bán" là hai chuyện khác nhau, và báo cáo cần phân biệt được.
      </p>
      <p className="ops-form-hint">
        Không chọn ca nào thì món <strong>bán cả ngày</strong>. Chọn ca là món chỉ hiện trong
        khung giờ của ca đó.
      </p>
      <p className="ops-form-hint">
        Ca nào, mấy giờ tới mấy giờ, và món nào thuộc ca nào đều do bạn đặt ở tab
        <strong> Ca phục vụ</strong>. Hệ thống không mặc định món nào bán buổi nào.
      </p>
      <p className="ops-form-hint">
        Số suất <strong>không tự nạp lại</strong> khi sang ca mới. Nguyên liệu nhập buổi nào thì
        chỉ buổi đó biết, nên con số phải do người nhập. Lọc theo ca ở trên để tìm nhanh món của
        ca sắp mở.
      </p>
    </div>
  );
}
