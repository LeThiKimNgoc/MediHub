import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* 🔥 Thêm viewport-fit=cover để tràn viền tai thỏ/Dynamic Island trên iPhone 🔥 */}
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* ========================================================================= */}
        {/* 🔥 BỘ GEN ĐẶC TRỊ CHO iPHONE / iPAD (Ép chạy Full màn hình, giấu thanh URL) 🔥 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MediHub" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* ========================================================================= */}

        {/* 🔥 BỘ GEN SEO CHUẨN "NGÀNH DƯỢC" CHO ZALO / FACEBOOK 🔥 */}
        <title>MediHub - Nền Tảng Y Tế Thông Minh</title>
        <meta name="description" content="Hệ thống theo dõi hồ sơ y tế và lịch dùng thuốc chuyên nghiệp. Đồng hành sức khỏe mỗi ngày." />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://medi-hub-beige.vercel.app/" />
        <meta property="og:title" content="MediHub - Nền Tảng Y Tế Thông Minh" />
        <meta property="og:description" content="Trợ lý đắc lực của Dược sĩ. Quản lý danh mục D&C và nhắc nhở bệnh nhân tuân thủ điều trị." />
        
        {/* 🔥 BANNER CHUẨN DƯỢC SĨ 🔥 */}
        <meta property="og:image" content="https://images.unsplash.com/photo-1585435557343-3b092031a831?q=80&w=1200&h=630&auto=format&fit=crop" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}