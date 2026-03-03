import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// 🔥 ĐÂY LÀ TÊN MIỀN VERCEL CỦA BẠN (Bác sĩ điền sẵn luôn cho lẹ) 🔥
const DOMAIN = 'https://medi-hub-beige.vercel.app';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 🔥 BỘ GEN SEO ĐỂ CHIA SẺ ZALO / FACEBOOK 🔥 */}
        <title>MediHub - Nền Tảng Y Tế Thông Minh</title>
        <meta name="description" content="Hệ thống theo dõi hồ sơ y tế và lịch dùng thuốc chuyên nghiệp. Đồng hành sức khỏe mỗi ngày." />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={DOMAIN} />
        <meta property="og:title" content="MediHub - Nền Tảng Y Tế Thông Minh" />
        <meta property="og:description" content="Hệ thống theo dõi hồ sơ y tế và lịch dùng thuốc chuyên nghiệp. Đồng hành sức khỏe mỗi ngày." />
        
        {/* 🔥 ẢNH BÌA CHÍNH CHỦ (Thay tên file ảnh của bạn vào đây nếu khác) 🔥 */}
        {/* Ví dụ bạn đặt tên là 'anh-bia-medihub.jpg' thì dòng dưới sẽ là: `${DOMAIN}/anh-bia-medihub.jpg` */}
        <meta property="og:image" content={`${DOMAIN}/anh-bia-medihub.jpg`} />

        {/* Thêm thẻ này để Zalo ưu tiên hiển thị ảnh to */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}