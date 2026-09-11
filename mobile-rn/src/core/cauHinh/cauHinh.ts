/**
 * Địa chỉ máy chủ mà app đang trỏ tới.
 *
 * Vì sao phải sửa được LÚC CHẠY thay vì chỉ đặt biến môi trường lúc dựng:
 *
 * Biến lúc dựng là **compile-time**. Một bản dựng ở CI mang sẵn `10.0.2.2:8081`, và địa chỉ đó
 * chỉ tồn tại **bên trong máy ảo Android** — cắm bản ấy vào điện thoại thật thì nó gọi vào hư
 * không. Muốn mỗi lần đổi mạng lại dựng một bản riêng thì phải có máy dựng được, thứ mà máy phát
 * triển của dự án này không có.
 *
 * Nên một bản dựng duy nhất + màn hình nhập địa chỉ là cách duy nhất để §9.10 ("kiểm thử trên
 * thiết bị thật, chụp bằng chứng ở mỗi pha") thực hiện được.
 */
export interface CauHinhMayChu {
  readonly apiBaseUrl: string;
  readonly imageBaseUrl: string;
}

export function cauHinhTuJson(json: unknown): CauHinhMayChu {
  const o = (json ?? {}) as Record<string, unknown>;
  return {
    apiBaseUrl: typeof o.apiBaseUrl === 'string' ? o.apiBaseUrl : '',
    imageBaseUrl: typeof o.imageBaseUrl === 'string' ? o.imageBaseUrl : '',
  };
}

/**
 * Chuẩn hoá thứ người dùng gõ thành một URL dùng được, hoặc `null` nếu không hiểu được.
 *
 * Người gõ trên bàn phím điện thoại sẽ gõ `192.168.1.5`, không gõ `http://192.168.1.5:8081/`.
 * Bắt họ gõ đủ là bắt họ gõ đúng ba thứ dễ sai trên một bàn phím nhỏ.
 *
 * Luật:
 * - thiếu scheme → thêm `http://` (mạng LAN trong quán không có TLS);
 * - thiếu cổng → thêm `congMacDinh`;
 * - cắt dấu `/` thừa ở cuối để việc ghép đường dẫn về sau không sinh ra `//`.
 */
export function chuanHoaDiaChi(nhapVao: string, congMacDinh: number): string | null {
  let s = nhapVao.trim();
  if (s.length === 0) return null;

  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    s = `http://${s}`;
  }

  let uri: URL;
  try {
    uri = new URL(s);
  } catch {
    return null;
  }
  if (uri.hostname.length === 0) return null;

  // Chặn thứ người dùng dễ dán nhầm: một đường dẫn đầy đủ tới endpoint chứ không phải địa chỉ gốc.
  // Nhận nó sẽ tạo ra "/api/menu/api/menu" và mọi lời gọi hỏng với lỗi khó hiểu.
  if (uri.pathname !== '' && uri.pathname !== '/') return null;

  // `URL.port` bỏ trống với cổng mặc định của scheme, nên `example.com:80` sẽ trông như không có
  // cổng và bị gán nhầm cổng mặc định của app. Đọc thẳng từ chuỗi để giữ đúng thứ người dùng gõ.
  const congGoTay = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*?:(\d+)(?:[/?#]|$)/i.exec(s);

  // Gõ `https://` mà KHÔNG gõ cổng nghĩa là bản triển khai thật sau nginx và TLS — tức 443, không
  // phải cổng LAN của app.
  //
  // LỖI CÓ THẬT, đo bằng chính hàm này:
  //
  //   "api.cmcrestaurant.app"           -> http://api.cmcrestaurant.app:8081    không ai nghe
  //   "https://api.cmcrestaurant.app"   -> https://api.cmcrestaurant.app:8081   không ai nghe
  //   "https://api.cmcrestaurant.app:443" -> https://api.cmcrestaurant.app:443  chạy
  //
  // Máy chủ công khai chỉ mở 80 và 443; 8081 là cổng nội bộ của container. Nên HAI cách gõ tự
  // nhiên nhất đều cho ra cấu hình chết, và người dùng chỉ thấy "không kết nối được máy chủ" —
  // không có gì chỉ ra rằng cái sai là một con số app tự thêm vào.
  //
  // `congMacDinh` giữ nguyên vai trò cho `http://` trong mạng LAN của quán, đúng lý do nó sinh ra.
  const macDinhTheoScheme = uri.protocol === 'https:' ? '443' : String(congMacDinh);
  const cong = congGoTay?.[1] ?? (uri.port !== '' ? uri.port : macDinhTheoScheme);

  return `${uri.protocol}//${uri.hostname}:${cong}`;
}

/**
 * Đoán địa chỉ ẢNH từ địa chỉ API.
 *
 * Ảnh do container web phục vụ ở cổng 8080, API ở 8081 — cùng máy. Đo thật: `:8081/menu-images`
 * trả 401, `:8080/menu-images` trả 200. Đoán giúp để người dùng chỉ phải gõ MỘT địa chỉ; vẫn sửa
 * được nếu triển khai khác.
 */
export function suyRaDiaChiAnh(apiBaseUrl: string, congAnh = 8080): string {
  try {
    const uri = new URL(apiBaseUrl);
    if (uri.hostname.length === 0) return apiBaseUrl;

    // KHÔNG có cổng trong địa chỉ = bản triển khai thật, đứng sau nginx và TLS.
    //
    // Gắn `:8080` vào đây là cho ra một địa chỉ KHÔNG TỚI ĐƯỢC: máy chủ công khai chỉ mở 80 và
    // 443, còn 8080 là cổng nội bộ của container. Đo trên máy chủ thật:
    //
    //   https://api.cmcrestaurant.app:8080/menu-images/…  -> không kết nối được
    //   https://api.cmcrestaurant.app/menu-images/…       -> 401 (miền này là API, đòi đăng nhập)
    //   https://order.cmcrestaurant.app/menu-images/…      -> 200 image/webp
    //
    // Ảnh do container web phục vụ, và nginx gắn nó vào các miền giao diện chứ không gắn vào miền
    // API. Nên đổi tiền tố `api.` thành `order.` — cùng quy ước mà cổng quản trị đang dùng để dựng
    // link đặt món.
    if (uri.port === '') {
      const host = uri.hostname.startsWith('api-')
        ? uri.hostname.replace(/^api-/, 'order-')
        : uri.hostname.replace(/^api\./, 'order.');
      return `${uri.protocol}//${host}`;
    }

    return `${uri.protocol}//${uri.hostname}:${congAnh}`;
  } catch {
    // Địa chỉ hỏng thì trả nguyên vào, không nổ: nơi gọi đang dựng giao diện, và một ngoại lệ ở
    // đây làm trắng màn hình vì một chuỗi cấu hình sai.
    return apiBaseUrl;
  }
}

/**
 * Địa chỉ máy chủ NƯỚNG SẴN vào bản dựng, dùng khi máy chưa có cấu hình nào.
 *
 * VÌ SAO CẦN, dù màn nhập địa chỉ vẫn giữ.
 *
 * Màn nhập sinh ra cho bản chạy thử: máy ảo Android dùng `10.0.2.2`, điện thoại thật dùng IP LAN,
 * và hai thứ đó đổi theo từng máy nên không nướng vào bản dựng được.
 *
 * Nhưng bản PHÁT HÀNH cho khách thì khác hẳn. Khách tải app về không biết địa chỉ máy chủ, không
 * nên biết, và một màn hỏi địa chỉ ngay khi mở app lần đầu là dấu hiệu của bản demo chứ không phải
 * sản phẩm. Địa chỉ production thì cố định, nên nó thuộc về lúc dựng.
 *
 * Đọc `EXPO_PUBLIC_API_BASE_URL` — Expo thay biến này bằng giá trị thật lúc đóng gói, nên nó nằm
 * sẵn trong bundle chứ không phải đọc lúc chạy. Bản dựng không khai biến thì hàm trả `null` và app
 * quay về hành vi cũ: hỏi địa chỉ. Đó là điều đúng cho bản chạy thử.
 *
 * Màn cài đặt VẪN dùng được để đổi sang máy chủ khác — hữu ích khi thử trên mạng LAN của quán.
 */
export function cauHinhMacDinh(): CauHinhMayChu | null {
  const tho = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof tho !== 'string' || tho.trim() === '') return null;

  // Đi qua đúng bộ chuẩn hoá mà ô nhập tay dùng, không tự ghép chuỗi. Một địa chỉ nướng sai định
  // dạng sẽ hỏng ở mọi máy cài app, và không ai sửa được từ xa.
  // Cổng mặc định 8081 chỉ dùng khi địa chỉ nướng vào thiếu cổng VÀ dùng http — tức bản dựng cho
  // mạng LAN. Địa chỉ production dạng `https://...` không cổng thì bộ chuẩn hoá tự chọn 443.
  const api = chuanHoaDiaChi(tho, 8081);
  if (api === null) return null;

  return { apiBaseUrl: api, imageBaseUrl: suyRaDiaChiAnh(api) };
}
