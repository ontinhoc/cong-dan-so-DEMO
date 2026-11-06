/**
 * ============================================================================
 * CLOUDFLARE WORKER: REVERSE PROXY CHO GOOGLE APPS SCRIPT WEB APP
 * ============================================================================
 * Tác dụng:
 * 1. Chạy trên Tên miền riêng (vd: kongang.congdanso.vn hoặc thidua.xakongang.gov.vn).
 * 2. Giấu hoàn toàn đường link dài dòng của Google Script (script.google.com/macros/s/...).
 * 3. Loại bỏ thanh cảnh báo màu vàng ở đầu trang của Google.
 * 4. Tự động hỗ trợ SSL HTTPS bảo mật xanh miễn phí.
 * ============================================================================
 */

// ĐIỀN ĐƯỜNG LINK DEPLOYMENT CỦA GOOGLE APPS SCRIPT VÀO ĐÂY:
const GOOGLE_SCRIPT_EXEC_URL = "https://script.google.com/macros/s/AKfycbxSWTgtrGbxEgED8gxK2-VN_v8MTZr2dRkfoyfeajqse7p0m16o8__oYIdb_YSN8J2r/exec";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Xử lý favicon nếu trình duyệt hỏi
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // Chuyển tiếp toàn bộ query parameter (nếu có)
    const targetUrl = new URL(GOOGLE_SCRIPT_EXEC_URL);
    url.searchParams.forEach((val, key) => {
      targetUrl.searchParams.set(key, val);
    });

    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      redirect: "follow"
    };

    // Đảm bảo Host header trỏ về script.google.com khi gửi request đi
    init.headers.set("Host", "script.google.com");
    init.headers.set("User-Agent", request.headers.get("User-Agent") || "Mozilla/5.0 Cloudflare-Worker");

    if (request.method === "POST") {
      init.body = await request.clone().arrayBuffer();
    }

    const response = await fetch(targetUrl.toString(), init);

    // Tạo response mới để có thể điều chỉnh header bảo mật & iframe
    const newHeaders = new Headers(response.headers);
    newHeaders.delete("X-Frame-Options");
    newHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  }
};
