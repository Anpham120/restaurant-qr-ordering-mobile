import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = new URL("../../", import.meta.url);
const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, srcRoot)), "utf8");

/**
 * Thay ghi chú bằng khoảng trắng, GIỮ NGUYÊN số dòng.
 *
 * Bản đầu của các cổng bên dưới quét thẳng nội dung thô, và một cái đỏ ngay: nó khớp đúng chuỗi
 * `useState<Order | null>` nằm trong ghi chú GIẢI THÍCH vì sao không được dùng nó nữa. Cổng báo
 * nhầm thì người ta học cách lờ nó, và tới lúc nó báo đúng cũng không ai nhìn.
 */
function boGhiChu(ts: string): string {
  return ts
    .replace(/\/\*[\s\S]*?\*\//g, (k) => k.replace(/[^\n]/g, " "))
    .replace(/^([^\n"'`]*?)\/\/.*$/gm, (_, truoc) => truoc);
}

const manager = () => boGhiChu(doc("components/admin/AdminOrderManager.tsx"));

describe("màn đơn bàn đồng bộ với bếp", () => {
  /**
   * NGĂN CHI TIẾT PHẢI ĐỌC TỪ DANH SÁCH SỐNG, KHÔNG TỪ MỘT BẢN SAO.
   *
   * Bản trước giữ `useState<Order | null>` và chỉ gán một lần lúc bấm mở. `load()` chạy lại trên
   * MỌI sự kiện realtime và cập nhật `orders` — nhưng bản sao trong state thì không ai đụng tới.
   *
   * Hệ quả đúng bằng thứ người trực quầy nhìn thấy: bếp chuyển món sang "Đang nấu" rồi "Chờ ra
   * món", màn bếp đổi ngay, còn ngăn chi tiết bên quầy đứng im ở trạng thái lúc mở — cho tới khi
   * có người đóng ra mở lại.
   *
   * Không lỗi nào hiện lên. Bảng phía sau VẪN cập nhật, kết nối realtime VẪN xanh, và chỉ đúng một
   * ô trên màn hình nói dối. Đó là lý do nó sống sót lâu.
   *
   * Phép kiểm neo vào NGUYÊN NHÂN chứ không vào triệu chứng: giữ mã đơn thì không còn hai bản để
   * mà lệch nhau; giữ cả đối tượng thì có.
   */
  it("giữ MÃ đơn trong state, không giữ bản sao của đơn", () => {
    const tsx = manager();

    expect(
      tsx,
      "`useState<Order | null>` cho đơn đang mở = một bản sao đóng băng lúc bấm mở",
    ).not.toMatch(/useState<Order \| null>/);
    expect(tsx, "phải giữ mã đơn").toMatch(/const \[selectedCode, setSelectedCode\] = useState</);
  });

  it("tra lại đơn đang mở từ danh sách vừa tải", () => {
    const tsx = manager();

    // `useMemo` phụ thuộc `orders`: mỗi lần tải lại là ngăn chi tiết tự đúng theo.
    const khoi = /const selectedOrder = useMemo\(([\s\S]*?)\);/.exec(tsx)?.[1] ?? "";
    expect(khoi, "không thấy chỗ tra lại đơn đang mở").not.toBe("");
    expect(khoi, "phải tra từ `orders`, nếu không nó lại là một bản sao").toContain("orders.find");
    expect(khoi, "thiếu `orders` trong danh sách phụ thuộc — sẽ không tính lại khi tải mới")
      .toMatch(/\[\s*orders\s*,/);
  });

  /**
   * Màn này refresh trên mọi sự kiện realtime. Bỏ `useOpsRealtime` đi là quay về chỉ còn nút "Làm
   * mới" bấm tay, và quầy sẽ nhìn một màn hình đứng yên trong khi bếp đang chạy.
   */
  it("vẫn nghe realtime", () => {
    expect(manager(), "mất đăng ký realtime — màn đơn bàn sẽ chỉ cập nhật khi bấm tay")
      .toMatch(/useOpsRealtime\(\{\s*refresh:/);
  });
});

describe("quầy chỉ xem, không thao tác", () => {
  /**
   * VÒNG ĐỜI ĐƠN THUỘC VỀ BẾP.
   *
   * Màn đơn bàn trước đây cho quầy bấm "Xác nhận", "Phục vụ", "Hoàn tất", "Hủy" — tức đổi trạng
   * thái đơn từ một màn hình KHÔNG nhìn thấy bếp. Hai người cùng đẩy một đơn từ hai chỗ, và người
   * thua cuộc không biết mình vừa thua.
   *
   * Thanh toán cũng ẩn ở đây, dù đó LÀ việc của quầy: nó có màn riêng, và trang này đã có sẵn nút
   * dẫn sang. Một thao tác tiền có hai lối vào là hai lối phải cùng đúng.
   */
  it("nhận diện vai quầy", () => {
    const tsx = manager();

    expect(tsx, "không phân biệt vai — mọi người thấy cùng một bộ nút").toMatch(
      /const chiXem = user\?\.role === "CounterStaff" \|\| user\?\.role === "Staff"/,
    );
  });

  it("mọi nút đổi trạng thái và thanh toán đều sau rào `chiXem`", () => {
    const tsx = manager();
    const pham: string[] = [];

    for (const [i, dong] of tsx.split(/\r?\n/).entries()) {
      if (!/handleStatusChange\(|handlePaymentAction\(/.test(dong)) continue;
      if (/async function handle/.test(dong)) continue; // định nghĩa, không phải chỗ gọi

      // Nút nằm trong một khối do `chiXem` gác. Tìm ngược lên tối đa 20 dòng.
      const truoc = tsx.split(/\r?\n/).slice(Math.max(0, i - 20), i).join("\n");
      if (!truoc.includes("!chiXem")) pham.push(`dòng ${i + 1}: ${dong.trim().slice(0, 70)}`);
    }

    expect(pham, "nút này quầy vẫn bấm được — vòng đời đơn thuộc về bếp").toEqual([]);
  });
});
