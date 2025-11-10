// 실제 Supabase 연결 설정
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase 설정이 누락되었습니다. .env 파일을 확인하세요.");
  console.error("   필요한 환경 변수: SUPABASE_URL, SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase 클라이언트 초기화 완료");
console.log(`📍 Supabase URL: ${supabaseUrl}`);

module.exports = supabase;
