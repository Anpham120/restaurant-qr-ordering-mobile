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
