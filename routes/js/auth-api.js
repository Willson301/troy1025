class AuthAPI {
  constructor() {
    this.baseURL = "/api/auth";
    this.tokenKey = "troy_token";
    this.token = localStorage.getItem(this.tokenKey);
  }

  headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem(this.tokenKey, token);
    else localStorage.removeItem(this.tokenKey);
  }

  async login(username, password) {
    try {
      const res = await fetch(`${this.baseURL}/login`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok)
        return { success: false, error: data.error || "로그인 실패" };
      this.setToken(data.token);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async signupAdvertiser(payload) {
    return this.signup({ userType: "advertiser", ...payload });
  }

  async signupAgency(payload) {
    return this.signup({ userType: "agency", ...payload });
  }

  async signupPartner(payload) {
    return this.signup({ userType: "partner", ...payload });
  }

  async signup(body) {
    try {
      const res = await fetch(`${this.baseURL}/signup`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "가입 실패" };
      this.setToken(data.token);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async profile() {
    try {
      const res = await fetch(`${this.baseURL}/profile`, {
        method: "GET",
        headers: this.headers(),
      });
      const data = await res.json();
      if (!res.ok)
        return { success: false, error: data.error || "불러오기 실패" };
      return { success: true, data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  logout() {
    this.setToken(null);
  }
}

window.authAPI = new AuthAPI();
