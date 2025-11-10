const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase] 환경변수가 비어 있습니다. .env의 SUPABASE_URL, SUPABASE_(ANON|SERVICE_ROLE)_KEY를 확인하세요."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
