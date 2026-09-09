import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = fileURLToPath(new URL("../", import.meta.url));

/** Mọi `.tsx` dưới `src/`, trừ tệp kiểm. */
function tepTsx(): string[] {
  const ra: string[] = [];
  const di = (thuMuc: string) => {
    for (const ten of readdirSync(thuMuc)) {
      if (ten === "node_modules" || ten === "dist") continue;
      const duong = join(thuMuc, ten);
      if (statSync(duong).isDirectory()) di(duong);
      else if (ten.endsWith(".tsx") && !ten.endsWith(".test.tsx")) ra.push(duong);
    }
  };
  di(srcRoot);
  return ra;
}

const tuongDoi = (duong: string) => duong.slice(srcRoot.length).split("\\").join("/");

type Bang = { tep: string; soCot: number; cotTien: number[]; than: string; dongThead: number };

/**
 * Mọi `<table>` có `<thead>`: số cột, chỉ số các cột đánh dấu `data-money`, và phần thân sau
 * `</thead>`.
 *
 * Đếm `<th` thô sẽ đếm nhầm cả `<thead`. Nên phải khớp `<th` kèm ký tự tiếp theo là `>` hoặc
 * khoảng trắng.
 */
function bangTrongTep(tep: string): Bang[] {
  const s = readFileSync(tep, "utf8");
  const ra: Bang[] = [];
  let i = 0;
  for (;;) {
    const moThead = s.indexOf("<thead>", i);
    if (moThead < 0) break;
    const dongThead = s.indexOf("</thead>", moThead);
    if (dongThead < 0) break;

    const head = s.slice(moThead, dongThead);
    const ths = [...head.matchAll(/<th(\s[^>]*)?>/g)];
    const cotTien: number[] = [];
    ths.forEach((m, k) => {
      if ((m[1] ?? "").includes("data-money")) cotTien.push(k);
    });

    const dongTable = s.indexOf("</table>", dongThead);
    ra.push({
      tep: tuongDoi(tep),
      soCot: ths.length,
      cotTien,
      than: s.slice(dongThead, dongTable < 0 ? s.length : dongTable),
      dongThead: s.slice(0, moThead).split("\n").length,
    });
    i = dongThead + 1;
  }
  return ra;
}

describe("bảng của mặt vận hành", () => {
  /**
   * `colSpan` CỦA DÒNG TRỐNG PHẢI BẰNG SỐ CỘT THẬT.
   *
   * Lệch thì dòng "chưa có dữ liệu" chỉ trải một phần bảng và chừa mấy ô rỗng lệch sang bên. Không
   * có gì báo lỗi — React dựng ra HTML hợp lệ, trình duyệt vẽ đúng thứ được bảo, và trạng thái
   * rỗng là thứ ít ai mở ra xem nhất khi đang phát triển.
   *
   * Đã xảy ra: `AdminPromotionsPage` để `colSpan={7}` trên bảng 8 cột. Nó sống sót qua nhiều lần
   * sửa vì chỉ hiện khi danh sách khuyến mãi rỗng.
   *
   * Cổng quét MỌI bảng trong `src/`, không riêng tệp đã hỏng — thêm một cột vào bất kỳ bảng nào mà
   * quên sửa dòng trống thì nó đỏ ngay.
   */
  it("colSpan của dòng trống khớp số cột", () => {
    const pham: string[] = [];

    for (const tep of tepTsx()) {
      for (const b of bangTrongTep(tep)) {
        for (const m of b.than.matchAll(/colSpan=\{(\d+)\}/g)) {
          if (Number(m[1]) !== b.soCot) {
            pham.push(`${b.tep}:${b.dongThead}  colSpan=${m[1]} nhưng bảng có ${b.soCot} cột`);
          }
        }
      }
    }

    expect(pham, "dòng trống trải thiếu cột thì nó chừa ô rỗng lệch bên").toEqual([]);
  });

  /**
   * `data-money` PHẢI ĐẶT Ở CẢ `<th>` LẪN `<td>` CỦA CÙNG MỘT CỘT.
   *
   * `.ops-table [data-money]` canh phải + `tabular-nums` + `nowrap`. Đặt lệch một bên là tiêu đề
   * canh trái còn số canh phải — ngay trong một cột. Đây là lỗi nhìn thấy được nhưng dễ bỏ qua, vì
   * mắt đọc bảng theo hàng chứ không theo cột.
   *
   * Đã xảy ra: cột "Lượt dùng" của `AdminPromotionsPage` có `data-money` ở ô mà không có ở tiêu đề
   * — và nó còn không phải cột tiền, chỉ là tỉ lệ "3/10".
   *
   * Chỉ soát HÀNG ĐẦU của thân bảng: các hàng còn lại do cùng một `map()` sinh ra.
   */
  it("data-money đặt nhất quán giữa tiêu đề và ô", () => {
    const pham: string[] = [];

    for (const tep of tepTsx()) {
      for (const b of bangTrongTep(tep)) {
        const hang = /<tr[^>]*>([\s\S]*?)<\/tr>/.exec(b.than);
        if (!hang) continue;
        const tds = [...hang[1]!.matchAll(/<td(\s[^>]*)?>/g)];
        tds.forEach((m, k) => {
          if (k >= b.soCot) return;
          const oCoTien = (m[1] ?? "").includes("data-money");
          const tieuDeCoTien = b.cotTien.includes(k);
          if (oCoTien !== tieuDeCoTien) {
            pham.push(
              `${b.tep}:${b.dongThead}  cột ${k + 1}: <td> ${oCoTien ? "có" : "không"} data-money,`
              + ` <th> ${tieuDeCoTien ? "có" : "không"}`,
            );
          }
        });
      }
    }

    expect(pham, "đặt `data-money` ở cả hai, hoặc bỏ ở cả hai").toEqual([]);
  });
});
