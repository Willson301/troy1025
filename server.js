const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// 미들웨어
app.use(cors());
// 대용량 JSON/폼 데이터 허용 (대표이미지 등 base64 포함 가능성)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname)));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/html", express.static(path.join(__dirname, "html")));
app.use("/image", express.static(path.join(__dirname, "image")));

// 메인 페이지
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// index.html 직접 접근
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 관리자 대시보드
app.get("/admin-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "admin-dashboard.html"));
});

// 캠페인 생성
app.get("/campaign-create.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "campaign-create.html"));
});

// 나의 정보
app.get("/my-info.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "my-info.html"));
});

// 회원가입 선택
app.get("/register-select.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "register-select.html"));
});

// 비밀번호 찾기
app.get("/password-find.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "password-find.html"));
});

// 문의하기
app.get("/inquiry.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "customer-support.html"));
});

// 광고주 회원가입
app.get("/advertiser-signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "advertiser-signup.html"));
});

// 에이전시 대시보드
app.get("/agency-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "agency-dashboard.html"));
});

// 에이전시 등록
app.get("/agency-register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "agency-register.html"));
});

// 클라이언트 관리
app.get("/client-management.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "client-management.html"));
});

// 클라이언트 관리 콘텐츠
app.get("/client-management-content.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "client-management-content.html"));
});

// 클라이언트 관리 통합
app.get("/client-management-integrated.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "html", "client-management-integrated.html")
  );
});

// 고객 대시보드
app.get("/customer-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "customer-dashboard.html"));
});

// 고객 지원
app.get("/customer-support.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "customer-support.html"));
});

// 관리자 나의 정보
app.get("/admin-my-info.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "admin-my-info.html"));
});

// 대시보드
app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "dashboard.html"));
});

// 공지사항
app.get("/notice-board.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "notice-board.html"));
});

// 파트너 대시보드
app.get("/partner-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "partner-dashboard.html"));
});

// 파트너 등록
app.get("/partner-register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "partner-register.html"));
});

// 결제 내역 (레거시 경로 호환: customer-payment-history.html로 전달)
app.get("/payment-history.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "payment-history.html"));
});

// 고객용 결제 내역
app.get("/customer-payment-history.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "customer-payment-history.html"));
});

// 회원가입
app.get("/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "register.html"));
});

// 일정 관리
app.get("/schedule-management.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "schedule-management.html"));
});

// 서비스 소개
app.get("/service-info.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "service-info.html"));
});

// Troy 벌크 캠페인
app.get("/troy-bulk-campaign.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "troy-bulk-campaign.html"));
});

// Troy 로그인
app.get("/troy-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "troy-login.html"));
});

// Troy 심플 캠페인
app.get("/troy-simple-campaign.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "troy-simple-campaign.html"));
});

// 클린 챗봇 UI
app.get("/clean-chatbot-ui.html", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "clean-chatbot-ui.html"));
});

// API 라우터
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Troy Dashboard 서버가 시작되었습니다!`);
  console.log(`📱 접속 주소: http://localhost:${PORT}`);
  console.log(
    `📁 대시보드: http://localhost:${PORT}/html/admin-dashboard.html`
  );
  console.log(`⏹️  서버 중지: Ctrl + C`);
  console.log(`🔄 자동 재시작: npm run dev`);
});

// 서버 종료 처리
process.on("SIGINT", () => {
  console.log("\n🛑 서버를 종료합니다...");
  process.exit(0);
});
