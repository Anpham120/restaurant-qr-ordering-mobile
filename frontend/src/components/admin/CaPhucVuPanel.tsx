import { useCallback, useEffect, useState } from "react";
import { Clock, Plus, Trash2 } from "lucide-react";
import {
  fetchCaPhucVu, suaCaPhucVu, taoCaPhucVu, xoaCaPhucVu, type CaPhucVu,
} from "../../services/adminMenuService";
import { gioNgan } from "./chuanBiThucDon";
import { useOpsConfirm } from "../operations/OpsConfirmProvider";
import "../operations/operations.css";

type Nhap = { name: string; startTime: string; endTime: string };

/**
 * CA PHỤC VỤ — quán tự khai khung giờ của mình.
 *
 * Không đóng cứng sáng/trưa/chiều/tối: quán này mở 10:00–14:00 và 18:00–22:00, nên hai trong bốn
 * khung cố định sẽ chết ngay từ đầu. Muốn bốn ca thì tạo bốn dòng, muốn hai ca thì hai dòng.
 */
export function CaPhucVuPanel() {
  const confirm = useOpsConfirm();
  const [ca, setCa] = useState<CaPhucVu[]>([]);
  const [nhap, setNhap] = useState<Record<string, Nhap>>({});
  const [moi, setMoi] = useState<Nhap>({ name: "", startTime: "06:00", endTime: "10:00" });
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

  const tai = useCallback(async () => {
    try {
      const ds = await fetchCaPhucVu();
      setCa(ds);
      setNhap(Object.fromEntries(ds.map((c) => [
        c.id,
        { name: c.name, startTime: gioNgan(c.startTime), endTime: gioNgan(c.endTime) },
      ])));
      setLoi("");
    } catch {
      setLoi("Không tải được ca phục vụ.");
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => { void tai(); }, [tai]);

  async function them() {
    if (moi.name.trim() === "") {
      setLoi("Ca phục vụ phải có tên.");
      return;
    }
    try {
      await taoCaPhucVu({ ...moi, name: moi.name.trim(), displayOrder: ca.length + 1 });
      setMoi({ name: "", startTime: "06:00", endTime: "10:00" });
      await tai();
    } catch {
      setLoi("Không tạo được ca. Kiểm tra lại giờ bắt đầu và giờ kết thúc.");
    }
  }

  async function luu(c: CaPhucVu) {
    const n = nhap[c.id];
    if (!n) return;
    try {
      await suaCaPhucVu(c.id, { ...n, name: n.name.trim(), displayOrder: c.displayOrder });
      await tai();
    } catch {
      setLoi("Không lưu được ca này.");
    }
  }

  async function xoa(c: CaPhucVu) {
    // Nói rõ hậu quả. Người bấm cần biết món KHÔNG biến mất, vì đó là nỗi lo hợp lý nhất khi xoá
    // một ca đang có món gán vào.
    const dong = await confirm({
      title: `Xoá ca "${c.name}"?`,
      message: "Những món đang gán vào ca này sẽ quay về bán cả ngày, không món nào bị ẩn đi.",
      confirmLabel: "Xoá ca",
      danger: true,
    });
    if (!dong) return;
    try {
      await xoaCaPhucVu(c.id);
      await tai();
    } catch {
      setLoi("Không xoá được ca này.");
    }
  }

  if (dangTai) {
    return (
      <div className="ops-empty">
        <div className="ops-empty-icon"><Clock aria-hidden="true" /></div>
        Đang tải...
      </div>
    );
  }

  return (
    <div>
      {loi ? <div className="ops-notice ops-notice--danger">{loi}</div> : null}

      <table className="ops-table">
        <thead>
          <tr>
            <th>Tên ca</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {ca.map((c) => {
            const n = nhap[c.id];
            if (!n) return null;
            const quaDem = n.startTime > n.endTime;
            return (
              <tr key={c.id}>
                <td>
                  <input
                    className="ops-form-input"
                    value={n.name}
                    onChange={(e) => setNhap((p) => ({ ...p, [c.id]: { ...n, name: e.target.value } }))}
                    onBlur={() => void luu(c)}
                    aria-label={`Tên ca ${c.name}`}
                  />
                </td>
                <td>
                  <input
                    className="ops-form-input chuan-bi-gio"
                    type="time"
                    value={n.startTime}
                    onChange={(e) => setNhap((p) => ({ ...p, [c.id]: { ...n, startTime: e.target.value } }))}
                    onBlur={() => void luu(c)}
                    aria-label={`Giờ bắt đầu ${c.name}`}
                  />
                </td>
                <td>
                  <input
                    className="ops-form-input chuan-bi-gio"
                    type="time"
                    value={n.endTime}
                    onChange={(e) => setNhap((p) => ({ ...p, [c.id]: { ...n, endTime: e.target.value } }))}
                    onBlur={() => void luu(c)}
                    aria-label={`Giờ kết thúc ${c.name}`}
                  />
                  {/* Ca bọc qua nửa đêm là hợp lệ, nhưng nhìn qua thì giống lỗi gõ. Nói ra để người
                      dùng biết hệ thống hiểu đúng ý mình. */}
                  {quaDem ? <div className="ops-note">qua đêm, sang hôm sau</div> : null}
                </td>
                <td>
                  <button
                    className="ops-btn ops-btn--ghost"
                    onClick={() => void xoa(c)}
                    type="button"
                    aria-label={`Xoá ca ${c.name}`}
                  >
                    <Trash2 aria-hidden="true" size={15} /> Xoá
                  </button>
                </td>
              </tr>
            );
          })}

          <tr>
            <td>
              <input
                className="ops-form-input"
                placeholder="Tên ca mới, ví dụ Sáng"
                value={moi.name}
                onChange={(e) => setMoi({ ...moi, name: e.target.value })}
                aria-label="Tên ca mới"
              />
            </td>
            <td>
              <input
                className="ops-form-input chuan-bi-gio"
                type="time"
                value={moi.startTime}
                onChange={(e) => setMoi({ ...moi, startTime: e.target.value })}
                aria-label="Giờ bắt đầu ca mới"
              />
            </td>
            <td>
              <input
                className="ops-form-input chuan-bi-gio"
                type="time"
                value={moi.endTime}
                onChange={(e) => setMoi({ ...moi, endTime: e.target.value })}
                aria-label="Giờ kết thúc ca mới"
              />
            </td>
            <td>
              <button className="ops-btn ops-btn--primary" onClick={() => void them()} type="button">
                <Plus aria-hidden="true" size={15} /> Thêm ca
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="ops-form-hint">
        Ca kết thúc <strong>sớm hơn</strong> giờ bắt đầu nghĩa là ca bọc qua nửa đêm, ví dụ lẩu đêm
        18:00–02:00. Đó là cấu hình hợp lệ, không phải lỗi gõ.
      </p>
      <p className="ops-form-hint">
        Đầu ca tính vào, cuối ca không. Ca 10:00–14:00 và ca 14:00–18:00 đặt cạnh nhau sẽ không
        chồng lên nhau tại đúng 14:00.
      </p>
      <p className="ops-form-hint">
        Xoá một ca <strong>không</strong> làm món nào biến mất: món đang gán vào ca đó quay về bán
        cả ngày.
      </p>
    </div>
  );
}
