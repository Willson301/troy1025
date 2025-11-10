// 클라이언트 사이드 Supabase 설정
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 사용자 정보 관련 함수들
export const userAPI = {
  // 사용자 정보 조회
  async getUserInfo(userId) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      let userData = null;
      let businessLicense = null;

      // 사용자 타입에 따라 해당 테이블에서 정보 조회
      if (profile.user_type === "advertiser") {
        const { data: advertiserData, error: advertiserError } = await supabase
          .from("advertisers")
          .select("*")
          .eq("id", userId)
          .single();

        if (advertiserError) throw advertiserError;
        userData = advertiserData;
      } else if (profile.user_type === "agency") {
        const { data: agencyData, error: agencyError } = await supabase
          .from("agencies")
          .select("*")
          .eq("id", userId)
          .single();

        if (agencyError) throw agencyError;
        userData = agencyData;
      } else if (profile.user_type === "partner") {
        const { data: partnerData, error: partnerError } = await supabase
          .from("partners")
          .select("*")
          .eq("id", userId)
          .single();

        if (partnerError) throw partnerError;
        userData = partnerData;
      }

      // 사업자등록증 정보 조회
      const { data: licenseData, error: licenseError } = await supabase
        .from("business_licenses")
        .select("*")
        .eq("user_id", userId)
        .order("upload_date", { ascending: false })
        .limit(1)
        .single();

      if (!licenseError && licenseData) {
        businessLicense = licenseData;
      }

      return {
        success: true,
        data: {
          ...profile,
          ...userData,
          businessLicense,
        },
      };
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // 사업자등록증 파일 업로드
  async uploadBusinessLicense(userId, file) {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `business-licenses/${fileName}`;

      // Supabase Storage에 파일 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("business-licenses")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 데이터베이스에 파일 정보 저장
      const { data: licenseData, error: licenseError } = await supabase
        .from("business_licenses")
        .insert({
          user_id: userId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        })
        .select()
        .single();

      if (licenseError) throw licenseError;

      return {
        success: true,
        data: licenseData,
      };
    } catch (error) {
      console.error("사업자등록증 업로드 오류:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // 사업자등록증 파일 다운로드 URL 생성
  async getBusinessLicenseDownloadUrl(userId) {
    try {
      const { data: licenseData, error: licenseError } = await supabase
        .from("business_licenses")
        .select("file_path")
        .eq("user_id", userId)
        .order("upload_date", { ascending: false })
        .limit(1)
        .single();

      if (licenseError) throw licenseError;

      const { data: downloadData, error: downloadError } =
        await supabase.storage
          .from("business-licenses")
          .createSignedUrl(licenseData.file_path, 3600); // 1시간 유효

      if (downloadError) throw downloadError;

      return {
        success: true,
        data: downloadData,
      };
    } catch (error) {
      console.error("다운로드 URL 생성 오류:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// 전역으로 노출
window.userAPI = userAPI;
window.supabase = supabase;
