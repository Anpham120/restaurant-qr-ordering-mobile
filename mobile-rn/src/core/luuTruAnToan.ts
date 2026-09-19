import * as SecureStore from 'expo-secure-store';

/**
 * Kho khoá–giá trị trên thiết bị.
 *
 * Tách thành interface để phần QUYẾT ĐỊNH (dữ liệu hỏng thì xoá, phiên hết hạn thì xoá) kiểm được
 * mà không cần thiết bị thật: `expo-secure-store` nói chuyện với Keychain (iOS) và Keystore
 * (Android) qua tầng native, thứ không tồn tại trong `jest`.
 */
export interface KhoAnToan {
  doc(khoa: string): Promise<string | null>;
  ghi(khoa: string, giaTri: string): Promise<void>;
  xoa(khoa: string): Promise<void>;
}

/**
 * Bản cất thật trên thiết bị.
 *
 * Vì sao KHÔNG dùng `AsyncStorage`: nó là file thường. Trên máy đã root, hoặc qua `adb backup` ở
 * app cho phép sao lưu, token đọc được bằng mắt. JWT ở đây là thứ thay được cả mật khẩu cho tới
 * lúc hết hạn.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, không phải `WHEN_UNLOCKED`. Mặc định của Keychain cho phép
 * mục dữ liệu đi theo bản sao lưu iCloud và sống lại trên MÁY KHÁC. Token của quán ăn không có lý
 * do gì để tồn tại trên một thiết bị mà khách chưa từng đăng nhập.
 */
export const khoThietBi: KhoAnToan = {
  doc: (khoa) => SecureStore.getItemAsync(khoa),
  ghi: (khoa, giaTri) =>
    SecureStore.setItemAsync(khoa, giaTri, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  xoa: (khoa) => SecureStore.deleteItemAsync(khoa),
};

/**
 * Đọc một khoá, coi MỌI thất bại là "chưa có gì" — và dọn luôn thứ đọc không được.
 *
 * Vì sao cần: `SecureStoreModule.kt` ném `DecryptException` khi khoá mã hoá của Keystore mất hiệu
 * lực. Đó không phải chuyện hiếm trên máy thật — khách đổi mã khoá màn hình hoặc vân tay, hoặc
 * phục hồi máy từ bản sao lưu, là khoá cũ chết và mọi giá trị đã cất trở thành rác không giải mã
 * được.
 *
 * Vì sao phải XOÁ chứ không chỉ trả `null`: blob chết nằm lại thì lần mở app SAU vẫn ném y hệt.
 * Khách sẽ bị đăng xuất mỗi lần mở app, mãi mãi, mà không có cách nào thoát ra ngoài việc gỡ app.
 * Xoá một lần là lần sau sạch.
 *
 * Cùng luật với nhánh `catch` mà mỗi kho đã có sẵn cho dữ liệu hỏng — chỉ là trước đây lời gọi
 * `doc()` nằm NGOÀI `try`, nên luật đó không bao giờ áp cho thất bại của chính Keystore.
 */
export async function docHoacDon(kho: KhoAnToan, khoa: string): Promise<string | null> {
  try {
    return await kho.doc(khoa);
  } catch {
    try {
      await kho.xoa(khoa);
    } catch {
      // Xoá cũng hỏng thì không còn gì làm được ở đây. Trả `null` vẫn đúng: app đi tiếp như chưa
      // từng cất gì, thay vì ném ra cho một nơi gọi không biết xử lý.
    }
    return null;
  }
}

/** Kho trong bộ nhớ, cho test. Không dùng trong app thật. */
export function khoTrongBoNho(banDau: Record<string, string> = {}): KhoAnToan {
  const bo = new Map<string, string>(Object.entries(banDau));
  return {
    doc: async (khoa) => bo.get(khoa) ?? null,
    ghi: async (khoa, giaTri) => {
      bo.set(khoa, giaTri);
    },
    xoa: async (khoa) => {
      bo.delete(khoa);
    },
  };
}
