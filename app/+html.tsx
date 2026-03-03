import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* 🔥 1. CHỐNG PHÓNG TO THU NHỎ KHI BẤM VÀO Ô NHẬP LIỆU (Giống hệt App thật) 🔥 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        {/* 🔥 2. GIẤY PHÉP BẮT BUỘC ĐỂ iPHONE CÔNG NHẬN LÀ APP (PWA) 🔥 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/assets/images/favicon.png" />

        {/* 🔥 3. BỘ GEN ĐẶC TRỊ ÉP TRÀN VIỀN & GIẤU THANH TRÌNH DUYỆT 🔥 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MediHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#14B8A6" />

        {/* 🔥 BỘ GEN SEO ZALO / FACEBOOK 🔥 */}
        <title>MediHub - Hệ Thống Quản Lý Dược Phẩm</title>
        <meta name="description" content="Nền tảng quản lý danh mục D&C và theo dõi lịch dùng thuốc chuyên nghiệp." />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medi-hub-beige.vercel.app/" />
        <meta property="og:title" content="MediHub - Quản Lý Dược Phẩm Thông Minh 💊" />
        <meta property="og:description" content="Trợ lý đắc lực của Dược sĩ. Quản lý danh mục D&C và nhắc nhở bệnh nhân tuân thủ điều trị." />
        
        <meta property="og:image" content="https://images.unsplash.com/photo-1585435557343-3b092031a831?q=80&w=1200&h=630&auto=format&fit=crop" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}