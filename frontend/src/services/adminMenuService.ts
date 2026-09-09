import type { AdminMenuCategory, AdminMenuItem, AdminMenuOverview } from "../types";
import { api } from "./apiClient";

export type AdminMenuItemPayload = {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  tags: string[];
  /**
   * Phút từ lúc bếp nhận món tới lúc món sẵn sàng.
   *
   * `null` khi SỬA nghĩa là GIỮ NGUYÊN, không phải xoá — máy chủ cố ý làm vậy để một client chưa
   * biết tới trường này không thổi bay con số bếp đã khai chỉ vì sửa cái tên.
   */
  prepMinutes: number | null;
  /**
   * Giá vốn. Cùng luật `null` = GIỮ NGUYÊN khi sửa, cùng lý do với `prepMinutes`.
   *
   * Để trống là hợp lệ và là trạng thái mặc định: không món nào có giá vốn cho tới khi có người
   * ngồi nhập. Báo cáo hao hụt hiện riêng số món chưa nhập thay vì cộng 0 cho chúng.
   */
  costPrice: number | null;
  /**
   * Số phần còn bán được. `null` khi SỬA = giữ nguyên; gửi `0` để báo HẾT.
   *
   * `null` và `0` là hai thứ khác nhau: `null` là không đếm phần, `0` là đã hết. Trộn chúng lại
   * là mất đường báo hết.
   */
  remainingQuantity: number | null;
};

function enrichMenuItem(item: AdminMenuItem): AdminMenuItem {
  return {
    ...item,
    imageUrl: item.imageUrl ?? "",
    tags: item.tags ?? [],
  };
}

export async function getAdminMenuOverview(): Promise<AdminMenuOverview> {
  const backendItems = await api.request<AdminMenuItem[]>("/admin/menu-items?includeInactiveCategories=true");
  const categoriesById = new Map<string, AdminMenuCategory>();

  backendItems.forEach((item) => {
    const existing = categoriesById.get(item.categoryId);
    categoriesById.set(item.categoryId, {
      id: item.categoryId,
      name: item.categoryName,
      isActive: existing?.isActive ?? true,
      itemCount: (existing?.itemCount ?? 0) + 1,
    });
  });

  return {
    categories: Array.from(categoriesById.values()),
    items: backendItems.map(enrichMenuItem),
  };
}

export async function setAdminMenuItemAvailability(
  itemId: string,
  isAvailable: boolean,
): Promise<AdminMenuItem> {
  return api.request<AdminMenuItem>(`/admin/menu-items/${encodeURIComponent(itemId)}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ isAvailable }),
  });
}

export async function createAdminMenuItem(payload: AdminMenuItemPayload): Promise<AdminMenuItem> {
  return api.request<AdminMenuItem>("/admin/menu-items", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminMenuItem(
  itemId: string,
  payload: AdminMenuItemPayload,
): Promise<AdminMenuItem> {
  return api.request<AdminMenuItem>(`/admin/menu-items/${encodeURIComponent(itemId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminMenuItem(itemId: string): Promise<void> {
  await api.request<void>(`/admin/menu-items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
}

// Simple list without overview enrichment
export async function fetchAdminMenuItems(): Promise<AdminMenuItem[]> {
  return api.request<AdminMenuItem[]>("/admin/menu-items?includeInactiveCategories=true");
}

/**
 * Số phần đang chờ bếp, theo mã món.
 *
 * Endpoint riêng của quản trị: con số này là thông tin vận hành, không nằm trong thực đơn công
 * khai. Lỗi được nuốt và trả về map rỗng — không biết hàng đợi thì cảnh báo nói ít đi một vế,
 * còn chặn cả màn thực đơn vì một con số phụ thì tệ hơn nhiều.
 */
export async function fetchPendingQuantities(): Promise<Record<string, number>> {
  try {
    return await api.request<Record<string, number>>("/admin/menu-items/pending-quantities");
  } catch {
    return {};
  }
}

// Kitchen-level list (includes unavailable items; usable by Kitchen/Staff/Admin)
export async function fetchKitchenMenuItems(): Promise<AdminMenuItem[]> {
  return api.request<AdminMenuItem[]>("/kitchen/menu-items");
}

export type ChuanBiMon = {
  menuItemId: string;
  isAvailable: boolean;
  remainingQuantity: number | null;
};

/**
 * Lưu thực đơn hôm nay: bật/tắt món và số suất, MỘT lượt gọi cho cả danh sách.
 *
 * Một lượt chứ không phải 91 lượt: nửa chừng mất mạng mà 40 món đã lưu còn 51 món chưa thì thực
 * đơn hôm đó ở trạng thái không ai chọn, và người sửa không biết mình dừng ở đâu.
 */
export async function luuThucDonHomNay(items: ChuanBiMon[]): Promise<{ daSua: number }> {
  return api.request<{ daSua: number }>("/admin/menu-items/chuan-bi-hom-nay", {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

// Kitchen-level toggle (also usable by Staff/Admin)
/**
 * Bếp khai độ trễ RIÊNG cho một món. `delayMinutes: 0` là xoá.
 *
 * Cùng đường `/kitchen/menu-items` với công tắc bật/tắt — bếp đã mở đúng bảng đó mỗi khi một món
 * gặp vấn đề, nên không có màn hình nào mới phải học.
 *
 * Khác `setKitchenDelay` (độ trễ của CẢ bếp) và CỘNG DỒN với nó.
 */
export async function khaiDoTreMon(
  itemId: string,
  delayMinutes: number,
  keepMinutes?: number,
): Promise<AdminMenuItem> {
  return api.request<AdminMenuItem>(
    `/kitchen/menu-items/${encodeURIComponent(itemId)}/delay`,
    { method: "PATCH", body: JSON.stringify({ delayMinutes, keepMinutes: keepMinutes ?? null }) },
  );
}

export async function toggleMenuItemAvailability(
  itemId: string,
  isAvailable: boolean,
): Promise<AdminMenuItem> {
  return api.request<AdminMenuItem>(
    `/kitchen/menu-items/${encodeURIComponent(itemId)}/availability`,
    { method: "PATCH", body: JSON.stringify({ isAvailable }) },
  );
}
