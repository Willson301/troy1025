/**
 * 파일: js/user-role-config.js
 * 목적: 사용자 역할 설정 및 관리
 *       각 대시보드에서 사용자 역할을 설정하는 예시
 */

// 사용자 역할 설정 함수들
function setUserRole(role) {
  localStorage.setItem("userRole", role);
  console.log("사용자 역할이", role, "로 설정되었습니다.");
}

// 관리자 역할 설정
function setAdminRole() {
  setUserRole("admin");
}

// 대행사 역할 설정
function setAgencyRole() {
  setUserRole("agency");
}

// 파트너사 역할 설정
function setPartnerRole() {
  setUserRole("partner");
}

// 고객사 역할 설정
function setClientRole() {
  setUserRole("client");
}

// 역할별 대시보드 이동
function goToAdminDashboard() {
  setAdminRole();
  window.location.href = "admin-dashboard.html?role=admin";
}

function goToAgencyDashboard() {
  setAgencyRole();
  window.location.href = "agency-dashboard.html?role=agency";
}

function goToPartnerDashboard() {
  setPartnerRole();
  window.location.href = "partner-dashboard.html?role=partner";
}

function goToClientDashboard() {
  setClientRole();
  window.location.href = "client-dashboard.html?role=client";
}

// 개발/테스트용 역할 전환 버튼 (실제 운영에서는 제거)
function addRoleSwitcher() {
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    const switcher = document.createElement("div");
    switcher.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #333;
      color: white;
      padding: 10px;
      border-radius: 5px;
      z-index: 9999;
      font-size: 12px;
    `;
    switcher.innerHTML = `
      <div>역할 전환:</div>
      <button onclick="goToAdminDashboard()" style="margin: 2px; padding: 2px 5px;">관리자</button>
      <button onclick="goToAgencyDashboard()" style="margin: 2px; padding: 2px 5px;">대행사</button>
      <button onclick="goToPartnerDashboard()" style="margin: 2px; padding: 2px 5px;">파트너사</button>
      <button onclick="goToClientDashboard()" style="margin: 2px; padding: 2px 5px;">고객사</button>
    `;
    document.body.appendChild(switcher);
  }
}

// 개발 환경에서만 역할 전환 버튼 추가
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addRoleSwitcher);
} else {
  addRoleSwitcher();
}
