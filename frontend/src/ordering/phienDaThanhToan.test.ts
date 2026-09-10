import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const doc = (duongDan: string) => readFileSync(join(__dirname, duongDan), "utf8");

/**
 * SAU KHI THANH TOÁN, TRANG ĐẶT MÓN KHÔNG ĐƯỢC TỰ MỞ PHIÊN MỚI.
 *
 * <p><b>Lỗi có thật bộ này canh.</b> `validateDineInSession` từng gộp MỌI trạng thái khác `Open`
 * thành `expired`. Trang đặt món hiểu `expired` là "khách vẫn đang ngồi, phiên chỉ rơi mất", nên
 * nó cứu bằng cách mở một phiên mới từ mã QR đã lưu — đúng việc cần làm cho phiên hết hạn.
 *
 * <p>Nhưng khách vừa trả tiền xong thì đó là việc sai. Chỉ cần tab còn mở và trang tự làm mới là
 * một hoá đơn mới sinh ra, bàn trông như đang có người ngồi, và không ai bấm gì cả.
 *
 * <p>Đo trên máy chủ thật: bàn T01 có phiên đóng lúc 14:30:12 sau khi webhook ngân hàng chốt hoá
 * đơn, và một phiên mới mở lúc 14:35:15 mà không có đơn nào.
 *
 * <p>Đây là test đọc MÃ NGUỒN chứ không dựng React, cùng lối với các bộ canh khác trong thư mục
 * này. Nó canh đúng một thứ: thông tin "đã thanh toán" không bị gộp mất lần nữa.
 */
describe("phiên đã thanh toán thì kết thúc, không mở phiên mới", () => {
  it("tách được trạng thái đã thanh toán khỏi hết hạn", () => {
    const dichVu = doc("../services/tableSessionService.ts");

    expect(
      dichVu,
      "ValidateDineInSessionResult phải có biến thể settled",
    ).toMatch(/\|\s*\{\s*status:\s*"settled"\s*\}/);
    expect(
      dichVu,
      "phải kiểm status === Closed TRƯỚC khi gộp về expired",
    ).toMatch(/session\.status === "Closed"[\s\S]{0,120}status: "settled"/);
  });

  it("KHÔNG cứu bằng cách mở phiên mới khi đã thanh toán", () => {
    const provider = doc("./OrderingSessionProvider.tsx");
    const viTriChan = provider.indexOf('nextState === "settled"');
    const viTriCuu = provider.indexOf("recoverTableSession", viTriChan);

    expect(viTriChan, "thiếu nhánh chặn cho trạng thái đã thanh toán").toBeGreaterThan(-1);
    // Nhánh chặn phải nằm TRƯỚC lần gọi cứu phiên gần nhất sau nó, và phải `return` để không rơi
    // xuống. Thiếu `return` thì nhánh có mặt mà vẫn mở phiên mới — hỏng y như cũ.
    expect(viTriCuu, "không thấy đường cứu phiên sau nhánh chặn").toBeGreaterThan(viTriChan);
    expect(
      provider.slice(viTriChan, viTriCuu),
      "nhánh đã thanh toán phải return trước khi tới đường cứu phiên",
    ).toContain("return;");
  });

  it("màn hình nói lời cảm ơn, không nói lỗi", () => {
    const layout = doc("./OrderingLayout.tsx");

    expect(layout, "thiếu trạng thái settled ở màn hình").toContain('"settled"');
    expect(layout, "phải có tiêu đề riêng cho ca đã thanh toán").toContain("Đã thanh toán xong");
    // Một câu báo lỗi ngay sau khi khách vừa trả tiền là nói sai chuyện vừa xảy ra.
    expect(layout).toMatch(/Cảm ơn quý khách/);
  });
});
