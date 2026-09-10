import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { AdminMenuItem } from "../../types";
import { luuSuatTheoCa, type CaPhucVu } from "../../services/adminMenuService";
import { gioNgan, tinhThayDoiSuatCa } from "./chuanBiThucDon";

type Props = {
  ca: CaPhucVu[];
  mon: AdminMenuItem[];
  /** Món đang gán vào ca nào. Món vắng mặt là món bán cả ngày. */
  ganCa: Record<string, string[]>;
  /** Số suất dự kiến đang lưu, tra theo `${caId}|${monId}`. */
  dangLuu: Record<string, number>;
  onLuuXong: () => void;
};

/**
 * SỐ SUẤT DỰ KIẾN CỦA MỘT CA — trưa bán hết mẻ thì tối vẫn bán được mẻ mới.
 *
 * Con số ở đây được chép sang số suất sống khi ca mở. Nó là cấu hình đứng yên, không phải quyết
 * định mỗi ngày, nên nó nằm ở tab Ca phục vụ chứ không phải tab Hôm nay.
 *
 * Chỉ liệt kê món ĐÃ GÁN vào ca đang chọn. Món bán cả ngày không thuộc ca nào nên không có số suất
 * riêng cho ca; số suất của nó vẫn đặt tay ở tab Hôm nay.
 */
export function SuatTheoCaBang({ ca, mon, ganCa, dangLuu, onLuuXong }: Props) {
  const [caDangChon, setCaDangChon] = useState<string>(ca[0]?.id ?? "");
  const [nhap, setNhap] = useState<Record<string, string>>({});
  const [dangGhi, setDangGhi] = useState(false);
  const [loi, setLoi] = useState("");
  const [thongBao, setThongBao] = useState("");

  const monTrongCa = useMemo(
    () => mon.filter((m) => (ganCa[m.id] ?? []).includes(caDangChon)),
    [mon, ganCa, caDangChon],
  );

  /** Số đang lưu của riêng ca đang chọn, đã bỏ tiền tố ca. */
  const luuCuaCaNay = useMemo(() => {
    const ra: Record<string, number> = {};
    for (const m of monTrongCa) {
      const so = dangLuu[`${caDangChon}|${m.id}`];
      if (so !== undefined) ra[m.id] = so;
    }
    return ra;
  }, [dangLuu, monTrongCa, caDangChon]);

  /** Ô nhập điền sẵn số đang lưu; ô trống nghĩa là ca này không quản số suất cho món đó. */
  const giaTri = (monId: string): string => {
    if (monId in nhap) return nhap[monId];
    const so = dangLuu[`${caDangChon}|${monId}`];
    return so === undefined ? "" : String(so);
  };

  const thayDoi = useMemo(() => {
    const day: Record<string, string> = {};
    for (const m of monTrongCa) {
      const so = dangLuu[`${caDangChon}|${m.id}`];
      day[m.id] = m.id in nhap ? nhap[m.id] : (so === undefined ? "" : String(so));
    }
    return tinhThayDoiSuatCa(day, luuCuaCaNay);
  }, [monTrongCa, nhap, dangLuu, caDangChon, luuCuaCaNay]);

  async function luu() {
    if (thayDoi.length === 0) return;
    setDangGhi(true);
    setThongBao("");
    try {
      await luuSuatTheoCa(caDangChon, thayDoi);
      setNhap({});
      setThongBao(`Đã đặt số suất cho ${thayDoi.length} món.`);
      onLuuXong();
    } catch {
      setLoi("Không lưu được số suất của ca này.");
    } finally {
      setDangGhi(false);
    }
  }

  if (ca.length === 0) {
    return <p className="ops-form-hint">Khai ít nhất một ca ở bảng trên rồi mới đặt được số suất.</p>;
  }

  const caHienTai = ca.find((c) => c.id === caDangChon);

  return (
    <div>
      {loi ? <div className="ops-notice ops-notice--danger">{loi}</div> : null}
      {thongBao ? <div className="ops-notice ops-notice--info">{thongBao}</div> : null}

      <div className="ops-toolbar">
        <div className="chuan-bi-ca">
          {ca.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chuan-bi-ca-chip ${c.id === caDangChon ? "chuan-bi-ca-chip--chon" : ""}`}
              onClick={() => { setCaDangChon(c.id); setNhap({}); setThongBao(""); }}
              aria-pressed={c.id === caDangChon}
            >
              {c.name} {gioNgan(c.startTime)}–{gioNgan(c.endTime)}
            </button>
          ))}
        </div>
        <button
          className="ops-btn ops-btn--primary"
          disabled={dangGhi || thayDoi.length === 0}
          onClick={() => void luu()}
          type="button"
        >
          <Check aria-hidden="true" size={15} />
          {thayDoi.length === 0 ? "Chưa có thay đổi" : `Lưu ${thayDoi.length} món`}
        </button>
      </div>

      {monTrongCa.length === 0 ? (
        <p className="ops-form-hint">
          Chưa món nào được gán vào ca <strong>{caHienTai?.name}</strong>. Gán món cho ca ở tab
          <strong> Hôm nay</strong>, cột Ca phục vụ.
        </p>
      ) : (
        <table className="ops-table">
          <thead>
            <tr>
              <th>Món</th>
              <th>Số suất dự kiến</th>
              <th>Số suất đang còn</th>
            </tr>
          </thead>
          <tbody>
            {monTrongCa.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>
                  <input
                    className="ops-form-input chuan-bi-so-suat"
                    type="number"
                    min={0}
                    value={giaTri(m.id)}
                    onChange={(e) => setNhap((p) => ({ ...p, [m.id]: e.target.value }))}
                    placeholder="Không quản"
                    aria-label={`Số suất dự kiến ${m.name}`}
                  />
                </td>
                {/* Cho thấy con số SỐNG ngay cạnh con số dự kiến. Không có nó thì người nhập
                    không biết ca đang chạy còn bao nhiêu, và dễ tưởng ô bên trái là số hiện tại. */}
                <td className="ops-note">
                  {m.remainingQuantity == null ? "không đếm" : m.remainingQuantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="ops-form-hint">
        Khi ca mở, số suất đang còn được <strong>đặt về</strong> số dự kiến, không cộng dồn phần
        thừa của ca trước. Ca mới là mẻ nguyên liệu mới.
      </p>
      <p className="ops-form-hint">
        Ô trống nghĩa là ca này <strong>không quản</strong> số suất cho món đó, và món giữ nguyên
        con số đang có. Gõ 0 là một lệnh khác hẳn: ca mở ra với 0 suất, tức món không bán trong ca.
      </p>
      <p className="ops-form-hint">
        Mỗi ca chỉ được nạp <strong>một lần</strong> cho mỗi ngày phục vụ. Ca qua đêm giữ nguyên
        ngày đó tới lúc đóng, nên không bị nạp lại vào lúc nửa đêm.
      </p>
    </div>
  );
}
