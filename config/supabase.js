// 로컬 메모리 기반 데이터베이스 (Supabase 대체)
require("dotenv").config();

// 인메모리 데이터 저장소
const db = {
  users: new Map(),
  user_profiles: new Map(),
  advertisers: new Map(),
  agencies: new Map(),
  partners: new Map(),
  campaigns: new Map(),
  tickets: new Map(),
  ticket_comments: new Map(),
};

// 테스트 사용자 데이터 추가
function initializeTestData() {
  // Admin 사용자 (이미 auth.js에서 하드코딩됨)

  // 테스트 광고주
  const advertiserUserId = "test-advertiser-001";
  db.user_profiles.set(advertiserUserId, {
    id: advertiserUserId,
    user_type: "advertiser",
    username: "test_advertiser"
  });
  db.advertisers.set(advertiserUserId, {
    id: advertiserUserId,
    business_number: "123-45-67890",
    company_name: "테스트 광고주",
    manager_name: "김광고",
    phone: "010-1234-5678",
    email: "advertiser@test.com",
    product_url: "https://example.com",
    approval_status: "approved",
    approved_at: new Date().toISOString()
  });

  // 테스트 대행사
  const agencyUserId = "test-agency-001";
  db.user_profiles.set(agencyUserId, {
    id: agencyUserId,
    user_type: "agency",
    username: "test_agency"
  });
  db.agencies.set(agencyUserId, {
    id: agencyUserId,
    business_number: "234-56-78901",
    agency_name: "테스트 대행사",
    manager_name: "이대행",
    phone: "010-2345-6789",
    email: "agency@test.com",
    website_url: "https://agency.example.com",
    approval_status: "approved",
    approved_at: new Date().toISOString()
  });

  // 테스트 파트너
  const partnerUserId = "test-partner-001";
  db.user_profiles.set(partnerUserId, {
    id: partnerUserId,
    user_type: "partner",
    username: "test_partner"
  });
  db.partners.set(partnerUserId, {
    id: partnerUserId,
    partner_code: "PARTNER001",
    manager_name: "박파트너",
    phone: "010-3456-7890",
    email: "partner@test.com",
    messenger_id: "@testpartner",
    approval_status: "approved",
    approved_at: new Date().toISOString()
  });

  // 비밀번호 저장 (실제로는 해시해야 하지만 테스트용으로 평문)
  db.users.set("advertiser@test.com", {
    id: advertiserUserId,
    email: "advertiser@test.com",
    password: "1234"
  });
  db.users.set("agency@test.com", {
    id: agencyUserId,
    email: "agency@test.com",
    password: "1234"
  });
  db.users.set("partner@test.com", {
    id: partnerUserId,
    email: "partner@test.com",
    password: "1234"
  });

  console.log("✅ 테스트 데이터 초기화 완료");
  console.log("📝 테스트 계정:");
  console.log("   광고주: test_advertiser / 1234");
  console.log("   대행사: test_agency / 1234");
  console.log("   파트너: test_partner / 1234");
  console.log("   관리자: admin / 1234");
}

// Mock Supabase Client
class LocalSupabaseClient {
  constructor() {
    this.db = db;
    this.auth = {
      signUp: async ({ email, password, options }) => {
        const userId = `user-${Date.now()}`;
        this.db.users.set(email, { id: userId, email, password });
        return {
          data: { user: { id: userId, email } },
          error: null
        };
      },
      signInWithPassword: async ({ email, password }) => {
        const user = this.db.users.get(email);
        if (!user || user.password !== password) {
          return {
            data: null,
            error: { message: "이메일 또는 비밀번호가 올바르지 않습니다." }
          };
        }
        return {
          data: { user: { id: user.id, email: user.email } },
          error: null
        };
      },
      admin: {
        deleteUser: async (userId) => {
          for (const [email, user] of this.db.users.entries()) {
            if (user.id === userId) {
              this.db.users.delete(email);
              break;
            }
          }
          return { data: null, error: null };
        },
        updateUserById: async (userId, updates) => {
          for (const [email, user] of this.db.users.entries()) {
            if (user.id === userId) {
              this.db.users.set(email, { ...user, ...updates });
              return { data: { user }, error: null };
            }
          }
          return { data: null, error: { message: "사용자를 찾을 수 없습니다." } };
        }
      }
    };
    this.storage = {
      from: (bucket) => ({
        upload: async (path, data, options) => {
          return { data: { path }, error: null };
        },
        getPublicUrl: (path) => {
          return { data: { publicUrl: `/storage/${path}` } };
        },
        createSignedUrl: async (path, expiresIn, options) => {
          return { data: { signedUrl: `/storage/${path}` }, error: null };
        },
        download: async (path) => {
          return { data: new Blob(), error: null };
        }
      }),
      createBucket: async (name, options) => {
        return { data: null, error: null };
      }
    };
  }

  from(table) {
    return {
      select: (columns, options) => {
        return {
          eq: (column, value) => {
            return {
              maybeSingle: async () => {
                const data = Array.from(this.db[table].values()).find(
                  row => row[column] === value
                );
                return { data: data || null, error: null };
              },
              single: async () => {
                const data = Array.from(this.db[table].values()).find(
                  row => row[column] === value
                );
                if (!data) {
                  return { data: null, error: { message: "데이터를 찾을 수 없습니다." } };
                }
                return { data, error: null };
              },
              order: (column, options) => ({
                limit: (count) => ({
                  single: async () => {
                    const data = Array.from(this.db[table].values()).find(
                      row => row[column] === value
                    );
                    if (!data) {
                      return { data: null, error: { message: "데이터를 찾을 수 없습니다." } };
                    }
                    return { data, error: null };
                  }
                }),
                range: async (from, to) => {
                  const filtered = Array.from(this.db[table].values()).filter(
                    row => row[column] === value
                  );
                  return { data: filtered, error: null, count: filtered.length };
                }
              }),
              range: async (from, to) => {
                const filtered = Array.from(this.db[table].values()).filter(
                  row => row[column] === value
                );
                return { data: filtered, error: null, count: filtered.length };
              }
            };
          },
          limit: (count) => ({
            single: async () => {
              const data = Array.from(this.db[table].values())[0] || null;
              return { data, error: null };
            }
          })
        };
      },
      insert: (data) => {
        return {
          select: () => ({
            single: async () => {
              const id = data.id || `${table}-${Date.now()}`;
              const record = { ...data, id, created_at: new Date().toISOString() };
              this.db[table].set(id, record);
              return { data: record, error: null };
            }
          })
        };
      },
      update: (data) => {
        return {
          eq: (column, value) => ({
            select: () => ({
              single: async () => {
                for (const [key, row] of this.db[table].entries()) {
                  if (row[column] === value) {
                    const updated = { ...row, ...data, updated_at: new Date().toISOString() };
                    this.db[table].set(key, updated);
                    return { data: updated, error: null };
                  }
                }
                return { data: null, error: { message: "데이터를 찾을 수 없습니다." } };
              }
            })
          })
        };
      },
      delete: () => {
        return {
          eq: async (column, value) => {
            for (const [key, row] of this.db[table].entries()) {
              if (row[column] === value) {
                this.db[table].delete(key);
              }
            }
            return { data: null, error: null };
          }
        };
      }
    };
  }

  raw(sql) {
    return sql;
  }
}

// 초기화
initializeTestData();

module.exports = new LocalSupabaseClient();
