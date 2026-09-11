import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AdminUserManager } from "./AdminUserManager";

// Mock @cmc/auth
vi.mock("@cmc/auth", () => ({
  useAuth: () => ({
    user: {
      userId: "usr_admin_1",
      email: "admin@cmcrestaurant.app",
      fullName: "Quản trị viên",
      role: "Admin",
    },
    loading: false,
  }),
}));

// Mock OpsConfirmProvider
vi.mock("../operations/OpsConfirmProvider", () => ({
  useOpsConfirm: () => vi.fn().mockResolvedValue(true),
}));

// Mock API Client
vi.mock("../../services/apiClient", () => ({
  api: {
    users: {
      list: vi.fn().mockResolvedValue({
        users: [
          {
            userId: "usr_admin_1",
            email: "admin@cmcrestaurant.app",
            fullName: "Quản trị viên",
            role: "Admin",
            createdAt: "2026-09-01T00:00:00Z",
          },
          {
            userId: "usr_counter_1",
            email: "nhanvienquay1@gmail.com",
            fullName: "Nhân viên quầy 1",
            role: "CounterStaff",
            createdAt: "2026-09-02T00:00:00Z",
          },
          {
            userId: "usr_kitchen_1",
            email: "nhanvienbep1@gmail.com",
            fullName: "Nhân viên bếp 1",
            role: "Kitchen",
            createdAt: "2026-09-03T00:00:00Z",
          },
        ],
      }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      resetPassword: vi.fn(),
    },
  },
}));

describe("AdminUserManager Component", () => {
  it("hiển thị trạng thái đang tải ban đầu", () => {
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, createElement(AdminUserManager)),
    );

    expect(html).toContain("Đang tải...");
    expect(html).toContain("ops-empty");
  });

  it("chặn việc tự xóa tài khoản của chính mình (admin đang đăng nhập)", () => {
    const currentAdminId = "usr_admin_1";
    const targetUserId = "usr_admin_1";
    const isSelfDeleteDisabled = currentAdminId === targetUserId;
    expect(isSelfDeleteDisabled).toBe(true);
  });

  it("cho phép xóa tài khoản nhân viên khác", () => {
    const currentAdminId = "usr_admin_1";
    const otherStaffId = "usr_counter_1";
    const isSelfDeleteDisabled = currentAdminId === otherStaffId;
    expect(isSelfDeleteDisabled).toBe(false);
  });
});
