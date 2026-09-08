import { useEffect } from "react";

/**
 * Bếp mặc định CHẾ ĐỘ TỐI.
 *
 * Vì sao chỉ riêng bếp: màn hình bếp dựng đứng trong phòng chói và người trực nhìn nó suốt ca. Nền
 * sáng ở đó vừa loá vừa mỏi. Quầy và quản trị theo hệ điều hành như bình thường.
 *
 * VÌ SAO ĐẶT `data-theme` RỒI GỠ RA, KHÔNG ĐẶT MỘT LẦN:
 * `data-theme` nằm trên `<html>`, tức nó áp cho CẢ ứng dụng chứ không riêng trang này. Ba vai dùng
 * chung một bundle (`admin-web`), nên một người vừa xem bảng bếp rồi chuyển sang `/counter` sẽ mang
 * theo nền tối sang quầy nếu không gỡ. Hàm dọn của effect là chỗ duy nhất chắc chắn chạy khi rời
 * trang.
 *
 * TÔN TRỌNG LỰA CHỌN CỦA NGƯỜI DÙNG:
 * Nếu `data-theme` đã có sẵn giá trị trước khi vào bếp thì đó là người dùng đã tự chọn, và tự chọn
 * thắng mặc định. Ghi đè lên nó là lấy mất một thiết lập người ta cố ý đặt.
 */
export function useKitchenDarkTheme(): void {
  useEffect(() => {
    const goc = document.documentElement;
    if (goc.getAttribute("data-theme")) return;

    goc.setAttribute("data-theme", "dark");
    return () => {
      // Chỉ gỡ thứ CHÍNH TA đặt. Trong khoảng thời gian trang mở, người dùng có thể đã bấm nút đổi
      // chủ đề; gỡ thẳng sẽ xoá lựa chọn đó.
      if (goc.getAttribute("data-theme") === "dark") goc.removeAttribute("data-theme");
    };
  }, []);
}
