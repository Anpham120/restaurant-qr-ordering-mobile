import { cauHinhMacDinh } from '../cauHinh';

/**
 * ĐỊA CHỈ MÁY CHỦ NƯỚNG SẴN VÀO BẢN DỰNG.
 *
 * Khách tải app về không biết địa chỉ máy chủ và không nên biết. Một màn hỏi địa chỉ ngay khi mở
 * app lần đầu là dấu hiệu của bản demo chứ không phải sản phẩm.
 *
 * Nhưng màn nhập vẫn phải giữ cho bản chạy thử: máy ảo Android dùng `10.0.2.2`, điện thoại thật
 * dùng IP LAN, và hai thứ đó đổi theo từng máy nên không nướng vào bản dựng được.
 */
describe('địa chỉ máy chủ nướng sẵn vào bản dựng', () => {
  const goc = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (goc === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = goc;
    }
  });

  /**
   * Ca quan trọng nhất: bản dựng KHÔNG khai biến thì phải trả `null` để app quay về hỏi địa chỉ.
   * Trả một giá trị bịa ở đây sẽ làm bản chạy thử trên máy ảo gọi vào hư không, và người dùng
   * không còn đường nào sửa vì màn nhập đã bị bỏ qua.
   */
  it('bản dựng không khai biến thì trả null', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(cauHinhMacDinh()).toBeNull();
  });

  it('chuỗi rỗng cũng coi như không khai', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = '   ';
    expect(cauHinhMacDinh()).toBeNull();
  });

  /**
   * Địa chỉ `https://` không cổng được gắn `:443`, KHÔNG phải `:8081`.
   *
   * Đây là điều đúng dù nhìn hơi lạ. Bộ chuẩn hoá luôn gắn một cổng tường minh, và với `https` thì
   * cổng đó phải là 443 — gắn 8081 sẽ cho ra một địa chỉ không tới được, vì máy chủ công khai chỉ
   * mở 80 và 443 còn 8081 là cổng nội bộ của container.
   *
   * `https://host:443` và `https://host` là một, nên không ảnh hưởng gì lúc gọi.
   */
  it('địa chỉ production được gắn cổng 443, không phải 8081', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.cmcrestaurant.app';
    const ch = cauHinhMacDinh();

    expect(ch?.apiBaseUrl).toBe('https://api.cmcrestaurant.app:443');
    expect(ch?.apiBaseUrl).not.toContain('8081');
  });

  /**
   * Ảnh do container web phục vụ, và nginx gắn nó vào miền giao diện chứ không gắn vào miền API.
   * Đo trên máy chủ thật: miền `api.` trả 401, miền `order.` trả 200 kèm `image/webp`.
   */
  it('địa chỉ ảnh suy ra từ miền đặt món, không phải miền API', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.cmcrestaurant.app';
    expect(cauHinhMacDinh()?.imageBaseUrl).toBe('https://order.cmcrestaurant.app');
  });

  /** Bản dựng cho mạng LAN vẫn chạy: thiếu scheme thì thêm `http://`, thiếu cổng thì thêm 8081. */
  it('địa chỉ LAN vẫn dùng được', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = '192.168.1.5';
    const ch = cauHinhMacDinh();

    expect(ch?.apiBaseUrl).toBe('http://192.168.1.5:8081');
    expect(ch?.imageBaseUrl).toBe('http://192.168.1.5:8080');
  });
});
