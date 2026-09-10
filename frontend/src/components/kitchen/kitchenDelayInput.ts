/**
 * Ô nhập số phút trễ do bếp tự khai.
 *
 * <p>Thay cho ba nút cố định +10 / +20 / +30. Ba mức đó là phỏng đoán của người viết mã về việc
 * bếp trễ bao nhiêu; bếp thì biết con số thật. Trễ 7 phút mà chỉ bấm được 10 nghĩa là hoặc khai
 * quá tay, hoặc thôi không khai — và cả hai đều làm ước lượng sai theo cách không ai truy ra được.
 *
 * <p>Tách khỏi màn hình vì phần khó ở đây KHÔNG phải vẽ ô nhập, mà là những giá trị người ta gõ
 * vào một ô trống. Cùng bài học với ô "Khách đưa" ở màn thu ngân: ở đó một biểu thức chính quy
 * viết sai làm ô xoá sạch thứ vừa gõ, và lỗi chỉ lộ ra khi bấm thật.
 */

/** Trần nghiệp vụ, PHẢI khớp {@code KitchenDelayService.TRAN_PHUT} bên máy chủ. */
export const TRAN_PHUT = 60;

export type KetQuaDoc =
  | { hopLe: true; phut: number }
  | { hopLe: false; loi: string };

/**
 * Đọc số phút người trực bếp gõ vào.
 *
 * <p>Trả về LỖI CỤ THỂ chứ không chỉ true/false: người đang đứng bếp giữa ca cao điểm cần biết
 * ngay phải sửa gì, không phải đoán xem ô đỏ vì lý do nào.
 */
export function docSoPhut(thoNhap: string): KetQuaDoc {
  const tho = thoNhap.trim();

  // Ô TRỐNG KHÔNG PHẢI SỐ 0. `Number("")` cho 0, và 0 nghĩa là TẮT cờ trễ — nên một ô trống bị
  // đọc thành 0 sẽ lặng lẽ tắt độ trễ mà người bấm tưởng mình vừa đặt nó.
  if (tho === "") {
    return { hopLe: false, loi: "Nhập số phút." };
  }

  // Chỉ nhận chữ số. `Number("12abc")` là NaN nhưng `Number(" 12 ")` là 12 và `Number("1e3")` là
  // 1000 — dựa vào `Number` một mình thì "1e3" lọt qua thành 1000 phút.
  if (!/^\d+$/.test(tho)) {
    return { hopLe: false, loi: "Chỉ nhập chữ số." };
  }

  const phut = Number(tho);

  // 0 là hợp lệ ở máy chủ (nghĩa là tắt), nhưng ở ô này thì không: đã có nút "Tắt" riêng, và gõ 0
  // vào ô "cộng thêm" là câu vô nghĩa. Nói rõ đường đúng thay vì im lặng làm một việc khác.
  if (phut === 0) {
    return { hopLe: false, loi: 'Muốn tắt thì bấm nút "Tắt".' };
  }

  // Chặn ở đây thay vì để máy chủ trả lỗi: cùng một giới hạn, nhưng báo trước khi mất một lượt
  // gọi mạng, và câu chữ nói được VÌ SAO.
  if (phut > TRAN_PHUT) {
    return {
      hopLe: false,
      loi: `Tối đa ${TRAN_PHUT} phút. Trễ hơn thế thì nên ngừng nhận món, không phải hiện số to hơn.`,
    };
  }

  return { hopLe: true, phut };
}

/**
 * Lọc phím gõ vào ô: giữ lại chữ số.
 *
 * <p>Tách riêng khỏi {@link docSoPhut} vì hai việc khác nhau — cái này chạy mỗi lần gõ, cái kia
 * chạy lúc gửi đi. Gộp làm một thì ô sẽ báo lỗi ngay khi người ta mới gõ chữ số đầu tiên.
 */
export function chiGiuChuSo(tho: string): string {
  return tho.replace(/\D/g, "");
}

/** Mỗi lần bấm cộng thêm bấy nhiêu phút cho độ trễ RIÊNG của một món. */
export const BUOC_DO_TRE_MON = 5;

/**
 * Con số kế tiếp khi bếp bấm nút độ trễ của một món: cộng dồn, tới trần thì VÒNG VỀ 0.
 *
 * MỘT NÚT LÀM HAI VIỆC, không phải một nút cộng cộng thêm một nút xoá.
 *
 * Bếp đang cầm dao, đeo găng, tay ướt. Gõ số vào ô là thao tác sai với hoàn cảnh, và một nút "xoá"
 * riêng là một nút nữa để bấm nhầm giữa lúc đông khách. Bấm quá thì bấm tiếp cho vòng lại — không
 * ai phải đi tìm cách hoàn tác.
 *
 * Trần dùng lại `TRAN_PHUT` của độ trễ chung: hai chỗ khai cùng một giới hạn là hai chỗ sẽ lệch.
 */
export function phutDoTreTiepTheo(hienTai: number): number {
  if (hienTai >= TRAN_PHUT) return 0;
  return Math.min(TRAN_PHUT, hienTai + BUOC_DO_TRE_MON);
}

/**
 * Con số kế tiếp khi bếp bấm nút GIẢM độ trễ của một món: trừ dần, chạm 0 là hết.
 *
 * VÌ SAO THÊM NÚT NÀY dù bản trước cố ý chỉ có một nút.
 *
 * Lý lẽ cũ đúng: bếp đang cầm dao, đeo găng, tay ướt, nên mỗi nút thêm là một chỗ bấm nhầm giữa
 * lúc đông khách. Cách hoàn tác của bản đó là bấm tiếp cho vòng về 0.
 *
 * Nhưng bước 5 phút với trần 60 làm phép vòng đó mất tới 12 lần bấm để quay lại chỗ cũ. Bấm nhầm
 * một cái phải bấm thêm mười một cái nữa thì không còn là hoàn tác, và người ta sẽ bỏ mặc con số
 * sai ở đó — tức ước lượng sai, đúng thứ tính năng này sinh ra để chống.
 *
 * Nút giảm CHỈ hiện khi độ trễ đang lớn hơn 0. Ở trạng thái thường, hàng vẫn đúng một nút như cũ,
 * nên không thêm chỗ bấm nhầm nào vào lúc bình thường.
 */
export function phutDoTreTruoc(hienTai: number): number {
  return Math.max(0, hienTai - BUOC_DO_TRE_MON);
}
