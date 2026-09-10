import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUOC_DO_TRE_MON, TRAN_PHUT, phutDoTreTiepTheo } from "./kitchenDelayInput";

describe("nút độ trễ riêng của món", () => {
  it("cộng dồn từng bước", () => {
    expect(phutDoTreTiepTheo(0)).toBe(BUOC_DO_TRE_MON);
    expect(phutDoTreTiepTheo(5)).toBe(10);
    expect(phutDoTreTiepTheo(55)).toBe(TRAN_PHUT);
  });

  /**
   * VÒNG VỀ 0 Ở TRẦN — đây là cách XOÁ, và là lý do không cần nút xoá riêng.
   *
   * Bếp đang cầm dao, đeo găng. Một nút nữa để bấm nhầm giữa giờ đông khách là một nút quá nhiều;
   * bấm quá thì bấm tiếp cho vòng lại, không ai phải đi tìm cách hoàn tác.
   */
  it("tới trần thì vòng về 0", () => {
    expect(phutDoTreTiepTheo(TRAN_PHUT)).toBe(0);
    expect(phutDoTreTiepTheo(TRAN_PHUT + 10)).toBe(0);
  });

  /** Không bao giờ vượt trần: chậm hơn một tiếng thì câu trả lời trung thực là TẮT món. */
  it("không vượt trần", () => {
    for (let i = 0; i <= TRAN_PHUT + 5; i += 1) {
      expect(phutDoTreTiepTheo(i)).toBeLessThanOrEqual(TRAN_PHUT);
    }
  });
});

describe("cụm nút độ trễ nằm đúng chỗ trong hàng", () => {
  const man = readFileSync(
    join(__dirname, "../../pages/kitchen/KitchenRealtimePage.tsx"),
    "utf8",
  );

  /**
   * LỖI CÓ THẬT CA NÀY CANH.
   *
   * Lần thêm nút giảm đầu tiên chèn nút vào BÊN TRONG thẻ tên món, vì thẻ đóng `</span>` bị đẩy
   * xuống dưới. JSX vẫn hợp lệ nên trình biên dịch không kêu một tiếng, test cũng xanh — chỉ mắt
   * người nhìn màn hình mới thấy: dấu trừ trôi lơ lửng cạnh tên món, cách con số một khoảng lớn.
   *
   * Đây là loại lỗi chỉ lộ ra khi nhìn, nên nó cần một phép canh đọc cấu trúc.
   */
  /**
   * Tìm thẻ đóng THẬT bằng cách đếm độ sâu, không dùng indexOf trên chuỗi thẻ đóng.
   *
   * Bản đầu của chính ca này dùng indexOf và nó RỖNG: bên trong thẻ tên món có một thẻ span lồng
   * cho nhãn "Hết", nên indexOf bắt vào thẻ đóng của nhãn con. Thẻ đó luôn đứng trước cụm độ trễ,
   * nên phép so lúc nào cũng đúng — kể cả khi cụm thật sự nằm lọt bên trong.
   *
   * Phát hiện ra bằng cách phá hoại có chủ ý: tái hiện đúng lỗi cũ mà test vẫn xanh.
   */
  function viTriDongThat(nguon: string, moTai: number): number {
    let sau = 0;
    for (let i = moTai; i < nguon.length; i += 1) {
      if (nguon.startsWith("<span", i)) {
        sau += 1;
      } else if (nguon.startsWith("</span>", i)) {
        sau -= 1;
        if (sau === 0) return i;
      }
    }
    return -1;
  }

  it("thẻ tên món phải ĐÓNG trước khi tới cụm độ trễ", () => {
    const moLabel = man.indexOf('<span className="ops-toggle-label">');
    const dongLabel = viTriDongThat(man, moLabel);
    const cum = man.indexOf("kitchen-mon-delay-cum", moLabel);

    expect(moLabel, "không thấy thẻ tên món").toBeGreaterThan(-1);
    expect(dongLabel, "không tìm được thẻ đóng của tên món").toBeGreaterThan(-1);
    expect(cum, "không thấy cụm độ trễ").toBeGreaterThan(-1);
    expect(
      cum,
      "cụm độ trễ đang nằm TRONG thẻ tên món — dấu trừ sẽ trôi cạnh tên",
    ).toBeGreaterThan(dongLabel);
  });

  /** Hai nút phải cùng nằm trong một cụm, nếu không chúng lại tách ra hai đầu hàng. */
  it("nút giảm và nút cộng cùng nằm trong cụm", () => {
    const cum = man.indexOf("kitchen-mon-delay-cum");
    const dongCum = man.indexOf("</span>", man.indexOf("kitchen-mon-delay\"", cum));

    expect(man.slice(cum, dongCum)).toContain("kitchen-mon-delay-bot");
    expect(man.slice(cum, dongCum)).toContain("phutDoTreTiepTheo");
  });
});
