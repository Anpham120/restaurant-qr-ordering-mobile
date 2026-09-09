export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryName: string;
  imageUrl: string;
  isAvailable: boolean;
  tags: string[];
  /** Phút từ lúc bếp nhận món tới lúc món sẵn sàng. `null` = chưa khai, không ước lượng được. */
  prepMinutes: number | null;
  /**
   * Số phần còn bán được. `null` = KHÔNG giới hạn (mặc định của mọi món), `0` = hết.
   *
   * Khách THẤY con số này khi món sắp hết, và nút "Thêm" tự khoá khi hết — để họ đổi ý TRƯỚC khi
   * gọi, chứ không nhận lỗi sau khi đã gửi bếp.
   */
  remainingQuantity: number | null;
};

export type MenuCart = Record<string, number>;

