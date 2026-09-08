/**
 * Luật bấm phím của bàn phím số ở quầy. Tách khỏi component để kiểm được mà không cần dựng DOM.
 *
 * Mọi giá trị đi qua đây là CHUỖI chữ số, không phải `number`. Số tiền Việt Nam thường xuyên vượt
 * mức an toàn khi người ta gõ nhầm thêm vài số 0, và `Number` thì im lặng làm tròn. Chuỗi giữ đúng
 * thứ người dùng gõ, và chỗ duy nhất đổi sang số là lúc gửi đi.
 */

/** Trần chữ số. 9 chữ số là 999 triệu — quá đủ cho một hoá đơn bàn, và chặn được gõ đè bất tận. */
export const TRAN_CHU_SO = 9;

export type PhimSo = string;

/**
 * Bố cục ba cột.
 *
 * `000` có mặt vì đơn vị tiền Việt Nam luôn kết thúc bằng nhiều số 0 — một hoá đơn 250.000đ là ba
 * lần bấm `2` `5` `000` thay vì sáu lần bấm. Nó ở hàng cuối cạnh `0` để tay không phải đi tìm.
 */
export const PHIM: PhimSo[][] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["000", "0", "⌫"],
];

/**
 * Giá trị mới sau khi bấm một phím.
 *
 * Ba luật, mỗi luật chặn một cách gõ hỏng:
 *
 * 1. **Không có số 0 đứng đầu.** Bấm `0` khi ô trống thì không có gì xảy ra. `0250000` là một chuỗi
 *    người ta đọc nhầm, và nó cũng không phải cách ai viết số tiền.
 * 2. **Trần chữ số.** Quá `TRAN_CHU_SO` thì bỏ qua phím, KHÔNG cắt bớt chuỗi. Cắt bớt là im lặng
 *    đổi con số người ta vừa gõ thành con số khác.
 * 3. **`000` tôn trọng trần.** Bấm `000` khi chỉ còn chỗ cho 2 chữ số thì không thêm gì, chứ không
 *    thêm hai số 0 rồi bỏ một — thêm một phần của phím là kết quả không ai đoán được.
 */
export function bamPhim(hienTai: string, phim: PhimSo): string {
  if (phim === "⌫") return hienTai.slice(0, -1);
  if (hienTai === "" && (phim === "0" || phim === "000")) return hienTai;
  if (hienTai.length + phim.length > TRAN_CHU_SO) return hienTai;
  return hienTai + phim;
}

/** Nhãn cho trình đọc màn hình. `⌫` đọc lên nghe như một ký hiệu lạ. */
export function nhanPhim(phim: PhimSo): string {
  if (phim === "⌫") return "Xoá một chữ số";
  if (phim === "000") return "Thêm ba số không";
  return `Số ${phim}`;
}
