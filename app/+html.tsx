import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

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
        <meta property="og:url" content="https://medi-hub-beige.vercel.app/" />
        <meta property="og:title" content="MediHub - Nền Tảng Y Tế Thông Minh" />
        <meta property="og:description" content="Hệ thống theo dõi hồ sơ y tế và lịch dùng thuốc chuyên nghiệp. Đồng hành sức khỏe mỗi ngày." />
        
        {/* Ảnh bìa siêu to khổng lồ khi chia sẻ (Bạn có thể đổi link ảnh khác sau này) */}
        <meta property="og:image" content="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}