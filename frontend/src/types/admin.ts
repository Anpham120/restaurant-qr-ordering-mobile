import type { OrderStatus, TableCode } from "./api";
import type { MenuItem } from "./menu";
import type { OrderItemStatus, PaymentStatus } from "./order";

export type AdminMenuCategory = {
  id: string;
  name: string;
  isActive: boolean;
  itemCount: number;
};

/**
 * `costPrice` CHỈ có ở đường `/api/admin/menu-items`, không có ở `/api/menu`.
 *
 * Máy chủ tách hẳn hai record (`AdminMenuItemResponse` và `MenuItemResponse`) đúng vì lý do này:
 * giá vốn là dữ liệu nội bộ, và thực đơn công khai thì bất kỳ khách nào cũng mở DevTools đọc được.
 *
 * `null` nghĩa là CHƯA NHẬP, không phải bằng 0.
 */
export type AdminMenuItem = MenuItem & {
  categoryId: string;
  costPrice: number | null;
};

export type AdminMenuOverview = {
  categories: AdminMenuCategory[];
  items: AdminMenuItem[];
};

export type AdminOrderType = "DineIn";

export type AdminOrderItem = {
  id: string;
  name: string;
  quantity: number;
  note?: string;
  status: OrderItemStatus;
};

export type AdminOrder = {
  id: string;
  code: string;
  type: AdminOrderType;
  tableCode?: TableCode;
  customerName: string;
  status: OrderStatus;
  total: number;
  placedAt: string;
  paymentStatus: PaymentStatus;
  items: AdminOrderItem[];
};
