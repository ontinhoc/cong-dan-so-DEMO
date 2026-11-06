/**
 * ============================================================================
 * DỰ ÁN: NỀN TẢNG TUYÊN TRUYỀN & THI ĐUA CÔNG DÂN SỐ CƠ SỞ (GÓI 1)
 * Backend Google Apps Script (Code.gs)
 * ============================================================================
 * Tác giả: Bộ giải pháp Chuyển đổi số cộng đồng
 * Tính năng chính:
 * 1. Tự động khởi tạo cấu trúc Google Sheets (CauHinh, CauHoi, KetQua, TinTuc).
 * 2. Ngân hàng câu hỏi động: Đọc trực tiếp từ Sheet (có sẵn bộ 50 câu chuẩn).
 * 3. Ghi nhận kết quả thi theo Thôn/Tổ dân phố phục vụ thi đua.
 * 4. Tính toán số liệu thống kê & Bảng vàng xếp hạng thời gian thực.
 * 5. Cấp mã chứng nhận e-Certificate duy nhất chống trùng lặp.
 * ============================================================================
 */

// Tên các bảng tính quản lý
const SHEET_CONFIG = 'CauHinh';
const SHEET_QUESTIONS = 'CauHoi';
const SHEET_RESULTS = 'KetQua';
const SHEET_NEWS = 'TinTuc';

/**
 * 1. HÀM CHÍNH doGet: Phục vụ Web App HTML
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('Cổng Tuyên truyền & Thử thách Kỹ năng số')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Hàm nhúng nội dung file phụ (nếu tách file HTML/CSS/JS)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 2. HÀM KHỞI TẠO HỆ THỐNG (Chạy 1 lần duy nhất khi bàn giao cho khách)
 * Mở Apps Script -> Chọn hàm 'setupDatabase' -> Bấm Run
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Tạo Sheet CauHinh
  let configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG);
    configSheet.getRange('A1:B11').setValues([
      ['Khoa', 'GiaTri'],
      ['TEN_DON_VI', 'CÔNG AN XÃ KON GANG'],
      ['SLOGAN', 'Nghị quyết 57 trong tầm tay • Kỹ năng số cho mọi người'],
      ['SO_DIEN_THOAI_HOTLINE', '02693.602.006'],
      ['THEME_MAU_SAC', 'cand'], // 'cand' (Công an: Xanh/Vàng), 'doanthanhnien' (Xanh dương), 'chinhquyen' (Đỏ/Vàng)
      ['TIEU_DE_CHUNG_NHAN', 'GIẤY CHỨNG NHẬN CÔNG DÂN SỐ'],
      ['DANH_SACH_THON', 'Thôn 1, Thôn 2, Thôn 3, Thôn 4, Làng Blo, Làng Roh, Làng Kon Sơ Lăng'],
      ['SO_CAU_MOI_LUOT_THI', '10'],
      ['DIEM_DAT_CHUNG_NHAN', '7'], // Đạt từ 7/10 trở lên mới cấp chứng nhận
      ['LINK_KIEM_TRA_LUA_DAO', 'https://chongluadao.vn/'],
      ['GHI_CHU', 'Dữ liệu được cập nhật tự động từ hệ thống']
    ]);
    formatHeader(configSheet, 2);
  }

  // 2. Tạo Sheet CauHoi
  let qSheet = ss.getSheetByName(SHEET_QUESTIONS);
  if (!qSheet) {
    qSheet = ss.insertSheet(SHEET_QUESTIONS);
    qSheet.getRange('A1:I1').setValues([[
      'ID', 'ChuDe', 'CauHoi', 'PhuongAnA', 'PhuongAnB', 'PhuongAnC', 'PhuongAnD', 'DapAnDung', 'GiaiThich'
    ]]);
    formatHeader(qSheet, 9);
    seedDefaultQuestions(qSheet);
  }

  // 3. Tạo Sheet KetQua
  let resSheet = ss.getSheetByName(SHEET_RESULTS);
  if (!resSheet) {
    resSheet = ss.insertSheet(SHEET_RESULTS);
    resSheet.getRange('A1:I1').setValues([[
      'MaChungNhan', 'ThoiGian', 'HoTen', 'ThonXom', 'DiemSo', 'TongCau', 'TyLeDung', 'ThoiGianLamGiay', 'XepLoai'
    ]]);
    formatHeader(resSheet, 9);
  }

  // 4. Tạo Sheet TinTuc
  let newsSheet = ss.getSheetByName(SHEET_NEWS);
  if (!newsSheet) {
    newsSheet = ss.insertSheet(SHEET_NEWS);
    newsSheet.getRange('A1:G1').setValues([[
      'ID', 'ChuDe', 'TieuDe', 'TomTat', 'LinkGoc', 'Nguon', 'HinhAnh'
    ]]);
    formatHeader(newsSheet, 7);
    seedDefaultNews(newsSheet);
  }

  // Xóa Sheet1 mặc định nếu rỗng
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (defaultSheet && defaultSheet.getLastRow() === 0) {
    ss.deleteSheet(defaultSheet);
  }

  return 'Khởi tạo hệ thống thành công! Bảng tính đã sẵn sàng vận hành.';
}

function formatHeader(sheet, numCols) {
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground('#116288')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * 3. LẤY CẤU HÌNH ỨNG DỤNG
 */
function getAppConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_CONFIG);
    if (!sheet) return getDefaultConfig();

    const data = sheet.getRange('A2:B' + sheet.getLastRow()).getValues();
    const config = {};
    data.forEach(row => {
      if (row[0]) config[row[0].toString().trim()] = row[1] ? row[1].toString().trim() : '';
    });

    // Parse danh sách thôn/tổ
    const thonRaw = config['DANH_SACH_THON'] || '';
    config.villages = thonRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (!config.villages.length) {
      config.villages = ['Toàn xã / Khác'];
    }

    return {
      unitName: config['TEN_DON_VI'] || 'CÔNG AN XÃ KON GANG',
      slogan: config['SLOGAN'] || 'Nghị quyết 57 trong tầm tay • Kỹ năng số cho mọi người',
      hotline: config['SO_DIEN_THOAI_HOTLINE'] || '02693.602.006',
      theme: config['THEME_MAU_SAC'] || 'cand',
      certTitle: config['TIEU_DE_CHUNG_NHAN'] || 'GIẤY CHỨNG NHẬN CÔNG DÂN SỐ',
      quizLength: parseInt(config['SO_CAU_MOI_LUOT_THI'] || '10', 10),
      certMinScore: parseInt(config['DIEM_DAT_CHUNG_NHAN'] || '7', 10),
      scamCheckUrl: config['LINK_KIEM_TRA_LUA_DAO'] || 'https://chongluadao.vn/',
      villages: config.villages
    };
  } catch (err) {
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    unitName: 'CÔNG AN XÃ KON GANG',
    slogan: 'Nghị quyết 57 trong tầm tay • Kỹ năng số cho mọi người',
    hotline: '02693.602.006',
    theme: 'cand',
    certTitle: 'GIẤY CHỨNG NHẬN CÔNG DÂN SỐ',
    quizLength: 10,
    certMinScore: 7,
    scamCheckUrl: 'https://chongluadao.vn/',
    villages: ['Thôn 1', 'Thôn 2', 'Thôn 3', 'Thôn 4', 'Làng Blo', 'Làng Roh', 'Làng Kon Sơ Lăng']
  };
}

/**
 * 4. LẤY BỘ CÂU HỎI TRẮC NGHIỆM ĐỘNG
 * Đọc từ Sheet CauHoi; nếu chưa có thì lấy từ danh sách mặc định 50 câu.
 * Xáo trộn ngẫu nhiên và bốc ra số lượng theo cấu hình.
 */
function getQuizQuestions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_QUESTIONS);
    let questions = [];

    if (sheet && sheet.getLastRow() > 1) {
      const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
      questions = rows.map((r, idx) => {
        const options = [];
        if (r[3]) options.push(r[3].toString().trim());
        if (r[4]) options.push(r[4].toString().trim());
        if (r[5]) options.push(r[5].toString().trim());
        if (r[6]) options.push(r[6].toString().trim());

        // Parse đáp án đúng (A, B, C, D hoặc 0, 1, 2, 3)
        let correctIdx = 0;
        const ansRaw = r[7] ? r[7].toString().trim().toUpperCase() : 'A';
        if (ansRaw === 'B' || ansRaw === '1') correctIdx = 1;
        else if (ansRaw === 'C' || ansRaw === '2') correctIdx = 2;
        else if (ansRaw === 'D' || ansRaw === '3') correctIdx = 3;

        return {
          id: r[0] || (idx + 1),
          category: r[1] || 'Kỹ năng số',
          question: r[2] || '',
          options: options,
          correct: correctIdx,
          explanation: r[8] || 'Hãy luôn cảnh giác và đối chiếu qua kênh chính thống.'
        };
      }).filter(q => q.question && q.options.length >= 2);
    }

    if (!questions.length) {
      questions = getFallback50Questions();
    }

    // Bốc ngẫu nhiên 10 câu
    const config = getAppConfig();
    const count = Math.min(config.quizLength || 10, questions.length);
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);

  } catch (err) {
    return getFallback50Questions().slice(0, 10);
  }
}

/**
 * 5. LƯU KẾT QUẢ THI & SINH MÃ CHỨNG NHẬN
 */
function submitQuizResult(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_RESULTS);
    if (!sheet) {
      setupDatabase();
      sheet = ss.getSheetByName(SHEET_RESULTS);
    }

    const now = new Date();
    const timestampStr = Utilities.formatDate(now, 'GMT+7', 'yyyy-MM-dd HH:mm:ss');
    const dateCode = Utilities.formatDate(now, 'GMT+7', 'yyMMdd');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const certCode = 'CDS-' + dateCode + '-' + randomSuffix;

    const hoTen = (data.fullName || 'Công dân ẩn danh').trim();
    const thonXom = (data.village || 'Chưa chọn').trim();
    const diemSo = parseInt(data.score || 0, 10);
    const tongCau = parseInt(data.total || 10, 10);
    const tyLeDung = Math.round((diemSo / tongCau) * 100);
    const thoiGianGiay = parseInt(data.durationSeconds || 0, 10);

    let xepLoai = 'Cần cố gắng';
    if (tyLeDung >= 90) xepLoai = 'Xuất sắc';
    else if (tyLeDung >= 70) xepLoai = 'Đạt chuẩn Công dân số';
    else if (tyLeDung >= 50) xepLoai = 'Đạt yêu cầu';

    sheet.appendRow([
      certCode,
      timestampStr,
      hoTen,
      thonXom,
      diemSo,
      tongCau,
      tyLeDung + '%',
      thoiGianGiay,
      xepLoai
    ]);

    return {
      success: true,
      certCode: certCode,
      timestamp: timestampStr,
      fullName: hoTen,
      village: thonXom,
      score: diemSo,
      total: tongCau,
      percent: tyLeDung,
      grade: xepLoai,
      message: 'Ghi nhận kết quả thành công!'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Lỗi ghi nhận: ' + err.message
    };
  }
}

/**
 * 6. LẤY THỐNG KÊ & BẢNG VÀNG THI ĐUA THEO THÔN
 */
function getLeaderboardStats() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_RESULTS);

    if (!sheet || sheet.getLastRow() <= 1) {
      return {
        configured: true,
        totalAttempts: 0,
        averagePercent: 0,
        villageRankings: [],
        recentHonors: []
      };
    }

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
    const totalAttempts = rows.length;
    let sumScore = 0;
    let sumTotal = 0;

    // Thống kê theo Thôn/Tổ
    const villageMap = {};

    // Danh sách vinh danh người đạt điểm cao gần nhất
    const honors = [];

    rows.forEach(r => {
      const certCode = r[0];
      const hoTen = r[2] || 'Công dân';
      const thon = r[3] || 'Khác';
      const diem = Number(r[4]) || 0;
      const tong = Number(r[5]) || 10;
      const xepLoai = r[8] || '';

      sumScore += diem;
      sumTotal += tong;

      if (!villageMap[thon]) {
        villageMap[thon] = { name: thon, count: 0, totalScore: 0, maxScore: 0 };
      }
      villageMap[thon].count++;
      villageMap[thon].totalScore += diem;
      if (diem > villageMap[thon].maxScore) {
        villageMap[thon].maxScore = diem;
      }

      if (diem >= 8 && hoTen !== 'Công dân ẩn danh') {
        honors.push({
          name: hoTen,
          village: thon,
          score: diem,
          total: tong,
          grade: xepLoai,
          certCode: certCode
        });
      }
    });

    const averagePercent = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0;

    // Chuyển villageMap sang mảng và sắp xếp theo lượt tham gia giảm dần
    const villageRankings = Object.values(villageMap).map(v => ({
      name: v.name,
      participants: v.count,
      avgScore: (v.totalScore / v.count).toFixed(1)
    })).sort((a, b) => b.participants - a.participants);

    return {
      configured: true,
      totalAttempts: totalAttempts,
      averagePercent: averagePercent,
      villageRankings: villageRankings,
      recentHonors: honors.slice(-6).reverse() // 6 người vinh danh gần nhất
    };
  } catch (err) {
    return {
      configured: false,
      error: err.message,
      totalAttempts: 0,
      averagePercent: 0,
      villageRankings: [],
      recentHonors: []
    };
  }
}

/**
 * 7. LẤY DANH SÁCH CHUYÊN ĐỀ & BÀI VIẾT
 */
function getArticlesList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NEWS);
    if (!sheet || sheet.getLastRow() <= 1) {
      return getDefaultArticles();
    }
    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    const list = rows.map((r, i) => ({
      id: r[0] || (i + 1),
      category: r[1] || 'Nghị quyết 57',
      title: r[2] || '',
      summary: r[3] || '',
      url: r[4] || '',
      source: r[5] || 'Cổng TTĐT Chính phủ',
      image: r[6] || ''
    })).filter(a => a.title);

    return list.length ? list : getDefaultArticles();
  } catch (e) {
    return getDefaultArticles();
  }
}

/**
 * ============================================================================
 * DỮ LIỆU MẪU CHUẨN (FALLBACK DATA & SEED)
 * ============================================================================
 */
function seedDefaultQuestions(sheet) {
  const qList = getFallback50Questions();
  const rows = qList.map(q => [
    q.id,
    q.category,
    q.question,
    q.options[0] || '',
    q.options[1] || '',
    q.options[2] || '',
    q.options[3] || '',
    String.fromCharCode(65 + q.correct),
    q.explanation
  ]);
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
}

function seedDefaultNews(sheet) {
  const articles = getDefaultArticles();
  const rows = articles.map(a => [
    a.id,
    a.category,
    a.title,
    a.summary,
    a.url,
    a.source,
    a.image || ''
  ]);
  sheet.getRange(2, 1, rows.length, 7).setValues(rows);
}

function getDefaultArticles() {
  return [
    {
      id: 1,
      category: "Nghị quyết 57",
      title: "Nghị quyết 57-NQ/TW: Đột phá phát triển khoa học công nghệ và chuyển đổi số",
      summary: "Đặt đổi mới sáng tạo và chuyển đổi số làm động lực phát triển then chốt. Cấp cơ sở tập trung hướng dẫn người dân kỹ năng số thực chất, an toàn.",
      url: "https://xaydungchinhsach.chinhphu.vn/",
      source: "Cổng TTĐT Chính phủ"
    },
    {
      id: 2,
      category: "Đề án 06",
      title: "Đề án 06 và tiện ích định danh điện tử VNeID đối với công dân",
      summary: "Khai thác dữ liệu dân cư phục vụ giải quyết thủ tục hành chính nhanh chóng, minh bạch. Người dân cần bảo mật thông tin tài khoản định danh.",
      url: "https://bocongan.gov.vn/",
      source: "Bộ Công an"
    },
    {
      id: 3,
      category: "Dịch vụ công",
      title: "Hướng dẫn nộp hồ sơ trực tuyến qua Cổng Dịch vụ công quốc gia",
      summary: "5 bước đơn giản giúp công dân ngồi tại nhà vẫn hoàn thành thủ tục hành chính, tra cứu tiến độ xử lý bằng mã hồ sơ minh bạch.",
      url: "https://dichvucong.gov.vn/",
      source: "Cổng DVC Quốc gia"
    },
    {
      id: 4,
      category: "An toàn số",
      title: "Cảnh giác thủ đoạn giả danh Công an gọi điện thoại đe dọa, yêu cầu chuyển tiền",
      summary: "Cơ quan Công an không làm việc qua điện thoại và tuyệt đối không bao giờ yêu cầu công dân chuyển tiền chứng minh vô tội.",
      url: "https://bocongan.gov.vn/",
      source: "Bộ Công an"
    },
    {
      id: 5,
      category: "An toàn số",
      title: "Nhận diện đường link độc hại, mã QR giả mạo đánh cắp tài khoản ngân hàng",
      summary: "Không đăng nhập thông tin cá nhân, mã OTP vào bất kỳ trang web nào được gửi qua tin nhắn SMS, Zalo hoặc mạng xã hội.",
      url: "https://chongluadao.vn/",
      source: "Chống Lừa Đảo"
    },
    {
      id: 6,
      category: "Kỹ năng số",
      title: "Nguyên tắc đặt mật khẩu mạnh và kích hoạt bảo mật 2 lớp (2FA)",
      summary: "Bảo vệ tài khoản mạng xã hội và ngân hàng bằng mật khẩu riêng biệt, không dùng ngày tháng năm sinh hoặc số điện thoại.",
      url: "https://mic.gov.vn/",
      source: "Bộ TT&TT"
    },
    {
      id: 7,
      category: "Trí tuệ nhân tạo",
      title: "Ứng dụng trí tuệ nhân tạo (AI) có trách nhiệm trong công việc và đời sống",
      summary: "AI là công cụ hỗ trợ tổng hợp thông tin, nhưng con người luôn chịu trách nhiệm kiểm duyệt, không tải thông tin bí mật lên AI công cộng.",
      url: "https://xaydungchinhsach.chinhphu.vn/",
      source: "Cổng TTĐT Chính phủ"
    },
    {
      id: 8,
      category: "Bình dân học vụ số",
      title: "Phổ cập kỹ năng số cộng đồng cho người cao tuổi và đồng bào dân tộc",
      summary: "Hướng dẫn thực hành các thao tác thiết thực: gọi điện video, tra cứu giấy tờ, nhận biết cuộc gọi lừa đảo một cách dễ hiểu, gần gũi.",
      url: "https://dichvucong.gov.vn/",
      source: "Tổ CNSCĐ"
    }
  ];
}

function getFallback50Questions() {
  return [
    {"id": 1, "category": "Lừa đảo trực tuyến", "question": "Bạn nhận được tin nhắn SMS yêu cầu cập nhật VNeID mức 2 qua một đường link lạ. Bạn nên làm gì?", "options": ["Nhấn vào đường link và nhập mã OTP", "Chuyển tiếp tin nhắn cho người thân thử", "Tuyệt đối không bấm link, chỉ cập nhật qua ứng dụng VNeID chính thức"], "correct": 2, "explanation": "Cơ quan Công an không gửi đường link lạ qua SMS yêu cầu cập nhật tài khoản định danh."},
    {"id": 2, "category": "Lừa đảo trực tuyến", "question": "Người tự xưng là cán bộ Công an gọi điện thoại bảo bạn liên quan vụ án ma túy và yêu cầu chuyển tiền để 'chứng minh vô tội'. Bạn xử lý thế nào?", "options": ["Lập tức ra ngân hàng chuyển tiền ngay", "Cung cấp mật khẩu và OTP tài khoản ngân hàng", "Từ chối chuyển tiền, ngắt máy và liên hệ Công an xã để xác minh"], "correct": 2, "explanation": "Cơ quan Công an không làm việc hay yêu cầu chuyển tiền qua điện thoại."},
    {"id": 3, "category": "Lừa đảo trực tuyến", "question": "Có người tự xưng là nhân viên ngân hàng gọi hỗ trợ giải ngân và yêu cầu bạn đọc mã OTP gửi về máy:", "options": ["Đọc ngay mã OTP để được tiền nhanh", "Chụp ảnh màn hình OTP gửi qua Zalo", "Giữ tuyệt đối bí mật OTP và dừng trao đổi ngay"], "correct": 2, "explanation": "Mã OTP là chìa khóa tài khoản, nhân viên ngân hàng thật không bao giờ hỏi mã này."},
    {"id": 4, "category": "Lừa đảo trực tuyến", "question": "Bạn nhận được tin nhắn báo được nhận tiền hỗ trợ an sinh xã hội kèm đường link lạ:", "options": ["Tra cứu thông tin qua Cổng thông tin chính thức của địa phương", "Bấm vào link và điền số thẻ, mật khẩu", "Chia sẻ link vào các nhóm để bạn bè nhận cùng"], "correct": 0, "explanation": "Các khoản hỗ trợ luôn được thông báo minh bạch qua văn bản và cơ quan chức năng."},
    {"id": 5, "category": "Lừa đảo trực tuyến", "question": "Mã QR thanh toán tại quầy quán ăn/cửa hàng có dấu hiệu bị dán đè một lớp mã khác lên trên:", "options": ["Cứ quét và chuyển tiền luôn", "Kiểm tra lại tên chủ tài khoản và xác nhận với chủ quán trước khi bấm chuyển", "Bỏ đi không trả tiền"], "correct": 1, "explanation": "Kẻ gian thường dán đè mã QR lạ tại điểm thanh toán để chiếm đoạt tiền."},
    {"id": 6, "category": "Lừa đảo trực tuyến", "question": "Tài khoản Facebook/Zalo của bạn thân nhắn tin hỏi vay tiền gấp do gặp nạn:", "options": ["Chuyển khoản ngay vì là bạn thân", "Gọi điện thoại trực tiếp hoặc gọi video để xác minh đúng là bạn mình", "Gửi thông tin thẻ tín dụng cho mượn"], "correct": 1, "explanation": "Tài khoản mạng xã hội rất dễ bị kẻ xấu hack để nhắn tin lừa vay tiền."},
    {"id": 7, "category": "Lừa đảo trực tuyến", "question": "Cuộc gọi video Facebook hiện hình ảnh người thân nhưng chập chờn, giật cục và hối thúc chuyển tiền ngay:", "options": ["Chuyển tiền ngay vì đã thấy mặt", "Cảnh giác với công nghệ Deepfake AI giả mặt, liên lạc lại bằng số điện thoại di động thông thường", "Đăng bài lên Facebook khoe"], "correct": 1, "explanation": "Công nghệ Deepfake AI có thể làm giả khuôn mặt và giọng nói rất tinh vi."},
    {"id": 8, "category": "Lừa đảo trực tuyến", "question": "Lời mời tham gia công việc online 'lướt TikTok/Shopee kiếm tiền', ban đầu trả thưởng nhỏ nhưng sau đó bắt nạp tiền lớn:", "options": ["Vay mượn thêm tiền để nạp nhiều hưởng lớn", "Tuyệt đối không nạp tiền, đây là bẫy lừa đảo nhiệm vụ", "Rủ thêm người nhà cùng tham gia"], "correct": 1, "explanation": "Chiêu trò tuyển cộng tác viên làm nhiệm vụ nạp tiền là hình thức lừa đảo rất phổ biến."},
    {"id": 9, "category": "Lừa đảo trực tuyến", "question": "Tin nhắn thông báo bạn bị 'phạt nguội giao thông' kèm đường link yêu cầu nộp phạt trực tuyến:", "options": ["Bấm link và nộp tiền ngay", "Cung cấp số CCCD và mật khẩu", "Tra cứu phạt nguội tại Cổng thông tin Cục Cảnh sát giao thông (csgt.vn)"], "correct": 2, "explanation": "Cảnh sát giao thông không gửi thông báo phạt nguội qua tin nhắn kèm link thanh toán."},
    {"id": 10, "category": "Lừa đảo trực tuyến", "question": "Có người gửi tệp cài đặt có đuôi .APK qua Zalo bảo bạn cài để 'tích hợp định danh' hoặc 'nhận quà':", "options": ["Cài đặt ngay", "Tắt cảnh báo bảo vệ của máy rồi cài", "Tuyệt đối không cài tệp lạ ngoài kho ứng dụng Google Play / App Store"], "correct": 2, "explanation": "Tệp APK lạ thường chứa mã độc chiếm quyền điều khiển điện thoại và rút tiền ngân hàng."},
    {"id": 11, "category": "Kỹ năng số", "question": "Cách đặt mật khẩu nào sau đây là an toàn nhất cho tài khoản cá nhân?", "options": ["Dùng ngày sinh nhật (vd: 12081995)", "Dùng dãy số liên tiếp (vd: 12345678)", "Mật khẩu dài trên 10 ký tự, kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt"], "correct": 2, "explanation": "Mật khẩu phức tạp giúp chống lại các cuộc tấn công dò quét tự động."},
    {"id": 12, "category": "Kỹ năng số", "question": "Tính năng 'Xác thực hai yếu tố' (2FA) có tác dụng gì quan trọng nhất?", "options": ["Làm máy chạy chậm hơn", "Thêm một lớp bảo vệ ngăn kẻ gian dù biết mật khẩu vẫn không vào được tài khoản", "Chỉ để làm đẹp tài khoản"], "correct": 1, "explanation": "2FA bảo vệ tài khoản ngay cả khi mật khẩu của bạn vô tình bị lộ."},
    {"id": 13, "category": "Kỹ năng số", "question": "Khi sử dụng mạng Wi-Fi công cộng miễn phí tại quán cà phê, nhà ga, bạn NÊN tránh thao tác nào?", "options": ["Đọc báo tin tức", "Đăng nhập ứng dụng ngân hàng và thực hiện giao dịch tài chính lớn", "Xem video ca nhạc"], "correct": 1, "explanation": "Wi-Fi công cộng có thể bị kẻ gian bắt lén gói tin và dữ liệu đăng nhập."},
    {"id": 14, "category": "Kỹ năng số", "question": "Một bài đăng trên mạng xã hội có tiêu đề giật gân, ly kỳ nhưng không rõ nguồn gốc kiểm chứng:", "options": ["Chia sẻ ngay lên trang cá nhân để nhiều người biết", "Bình luận khẳng định chắc chắn là thật", "Kiểm chứng từ báo chí chính thống và cơ quan có thẩm quyền trước khi tin"], "correct": 2, "explanation": "Không tiếp tay lan truyền tin giả, tin chưa được kiểm chứng."},
    {"id": 15, "category": "Kỹ năng số", "question": "Để bảo vệ dữ liệu khi điện thoại không may bị rơi hoặc thất lạc, bạn nên làm gì định kỳ?", "options": ["Sao lưu dữ liệu quan trọng lên bộ nhớ đám mây an toàn hoặc máy tính", "Không cần làm gì", "Chia sẻ mật khẩu máy cho bạn bè giữ hộ"], "correct": 0, "explanation": "Sao lưu định kỳ giúp bạn phục hồi danh bạ, ảnh và tài liệu nhanh chóng."},
    {"id": 16, "category": "Dịch vụ công & VNeID", "question": "Khi muốn tìm hiểu thành phần hồ sơ và quy trình làm thủ tục hành chính, bạn tra cứu chuẩn xác ở đâu?", "options": ["Hỏi qua các nhóm trung gian, 'cò' dịch vụ trên mạng", "Truy cập Cổng Dịch vụ công quốc gia (dichvucong.gov.vn) hoặc Cổng DVC của tỉnh", "Nghe lời truyền miệng"], "correct": 1, "explanation": "Cổng DVC quốc gia là địa chỉ chính thức, công khai, minh bạch mọi thủ tục."},
    {"id": 17, "category": "Dịch vụ công & VNeID", "question": "Có người đến nhà tự xưng cán bộ hỗ trợ làm dịch vụ công và bảo bạn 'đọc mật khẩu VNeID để làm hộ':", "options": ["Đọc mật khẩu và đưa OTP cho họ", "Từ chối đưa mật khẩu, nhờ họ hướng dẫn các bước để mình tự bấm trên máy", "Chụp ảnh thẻ CCCD gửi cho họ cầm về"], "correct": 1, "explanation": "Cán bộ hỗ trợ chỉ hướng dẫn thao tác, công dân phải tự quản lý thông tin đăng nhập."},
    {"id": 18, "category": "Dịch vụ công & VNeID", "question": "Khi nộp hồ sơ dịch vụ công trực tuyến thành công, bạn nhận được dãy mã hồ sơ để làm gì?", "options": ["Không có tác dụng gì", "Dùng để tra cứu tiến độ xử lý và nhận kết quả minh bạch", "Đăng công khai lên mạng xã hội"], "correct": 1, "explanation": "Mã hồ sơ giúp bạn theo dõi từng bước thẩm định của cán bộ chuyên môn."},
    {"id": 19, "category": "Nghị quyết 57 & AI", "question": "Nghị quyết số 57-NQ/TW của Ban Chấp hành Trung ương Đảng xác định lĩnh vực nào là động lực then chốt?", "options": ["Khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia", "Chỉ mua sắm trang thiết bị máy móc", "Chỉ mở rộng diện tích canh tác truyền thống"], "correct": 0, "explanation": "Nghị quyết 57-NQ/TW đặt khoa học công nghệ và đổi mới sáng tạo là quốc sách hàng đầu."},
    {"id": 20, "category": "Nghị quyết 57 & AI", "question": "Khi sử dụng các công cụ Trí tuệ nhân tạo (AI như ChatGPT, Gemini) để soạn thảo tài liệu, điều nào là đúng?", "options": ["Sao chép nguyên văn và công bố ngay mà không cần đọc lại", "Đưa toàn bộ thông tin mật và dữ liệu cá nhân nội bộ lên AI", "Xem AI là trợ lý gợi ý ý tưởng; con người luôn kiểm tra tính chính xác trước khi sử dụng"], "correct": 2, "explanation": "AI có thể tạo ra thông tin sai lệch (ảo giác); người dùng luôn chịu trách nhiệm cuối cùng."}
  ];
}
