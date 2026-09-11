import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  envDir: "../..",
  // Ảnh món nằm ở thư mục public DÙNG CHUNG của monorepo, không nằm trong app này.
  //
  // Thiếu dòng này thì `/menu-images/*` trả 404 và mọi thẻ món trong màn Thực đơn hiện ảnh vỡ —
  // đúng thứ nhìn thấy trên máy phát triển. `customer-web` và `ordering-web` đã khai từ trước;
  // `admin-web` bị bỏ sót dù nó là màn DUY NHẤT hiển thị ảnh món cho người quản lý.
  publicDir: "../../public",
  plugins: [react()],
  server: { port: 5174 },
  build: { outDir: "dist" },
});
