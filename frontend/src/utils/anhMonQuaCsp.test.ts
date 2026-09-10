import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const nginx = () => readFileSync(join(__dirname, "../../nginx.conf"), "utf8");

/**
 * CHỈ đọc dòng `add_header`, bỏ hết dòng chú thích.
 *
 * Bản đầu của chính bộ này khớp vào chữ `img-src` nằm trong chú thích giải thích ngay phía trên —
 * nên nó đo lời văn của tôi chứ không đo cấu hình. Một phép canh đọc trúng chú thích của chính nó
 * là một phép canh luôn xanh.
 */
function dongCsp(): string {
  const dong = nginx()
    .split("\n")
    .find((d) => d.trim().startsWith("add_header Content-Security-Policy"));
  if (!dong) {
    throw new Error("không thấy dòng add_header Content-Security-Policy");
  }
  return dong;
}

/**
 * ẢNH MÓN PHẢI QUA ĐƯỢC CHÍNH SÁCH BẢO MẬT NỘI DUNG Ở MỌI MÔI TRƯỜNG.
 *
 * <p><b>Lỗi có thật ca này canh.</b> Màn quản trị tải ảnh món từ tên miền của app ĐẶT MÓN chứ
 * không từ chính nó — xem `toPublicMenuImageUrl`. Bản trước chỉ cho phép
 * `https://order.cmcrestaurant.app`, tức tên miền production. Admin trên staging tải ảnh từ
 * `order-staging.cmcrestaurant.app` nên bị trình duyệt CHẶN: ảnh vỡ ở staging, production thì
 * không.
 *
 * <p><b>Vì sao khó tìm.</b> `curl` không đọc chính sách này. Gọi thẳng URL ảnh trả về 200 kèm
 * `image/webp` 79KB — trông như mọi thứ đều ổn, và tôi đã kết luận nhầm là lỗi ở máy phát triển.
 * Chỉ trình duyệt mới chặn, nên chỉ ảnh chụp màn hình mới lộ ra.
 *
 * <p>Liệt kê từng môi trường thì mỗi lần thêm môi trường lại hỏng lại. Ca này canh việc đó.
 */
describe("ảnh món qua được CSP ở mọi môi trường", () => {
  function chiThi(ten: string): string {
    const khop = dongCsp().match(new RegExp(`${ten}([^;]*);`));
    if (!khop) {
      throw new Error(`không thấy ${ten} trong nginx.conf`);
    }
    return khop[1]!;
  }

  it("cho phép tên miền con, không đóng cứng một môi trường", () => {
    expect(
      chiThi("img-src"),
      "img-src đang đóng cứng một tên miền — môi trường khác sẽ bị chặn ảnh",
    ).toContain("https://*.cmcrestaurant.app");
  });

  /**
   * Ký tự đại diện cho tên miền con KHÔNG bao gồm chính tên miền gốc, nên vẫn phải khai riêng.
   * Bỏ sót thì trang giới thiệu ở tên miền gốc mất ảnh.
   */
  it("vẫn cho phép tên miền gốc", () => {
    expect(chiThi("img-src")).toContain("https://cmcrestaurant.app");
  });

  /** Nới cho ảnh KHÔNG được nới cho mã chạy. Đây là ranh giới đáng giữ nhất của cả chính sách. */
  it("không nới lỏng script-src", () => {
    expect(chiThi("script-src"), "script-src bị nới ra ngoài 'self'").toBe(" 'self'");
  });
});
