document.addEventListener('DOMContentLoaded', function() {
    // 요소들 가져오기
    const typeCards = document.querySelectorAll('.type-card');
    const businessLicenseGroup = document.getElementById('business-license-group');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('business-license');
    const uploadedFile = document.getElementById('uploadedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeFileBtn = document.getElementById('removeFile');
    const signupForm = document.getElementById('signupForm');
    
    // 광고주 유형 선택
    typeCards.forEach(card => {
        card.addEventListener('click', function() {
            // 모든 카드에서 active 클래스 제거
            typeCards.forEach(c => c.classList.remove('active'));
            // 클릭한 카드에 active 클래스 추가
            this.classList.add('active');
            
            const selectedType = this.dataset.type;
            
            // 광고대행사 선택 시 사업자등록증 업로드 필드 표시
            if (selectedType === 'agency') {
                businessLicenseGroup.style.display = 'block';
                fileInput.setAttribute('required', 'required');
            } else {
                businessLicenseGroup.style.display = 'none';
                fileInput.removeAttribute('required');
                // 업로드된 파일 초기화
                resetFileUpload();
            }
        });
    });
    
    // 파일 업로드 영역 클릭 이벤트
    fileUploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // 드래그 앤 드롭 이벤트
    fileUploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#667eea';
        this.style.background = '#f8f9ff';
    });
    
    fileUploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#d1d9e6';
        this.style.background = '#fafbfc';
    });
    
    fileUploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#d1d9e6';
        this.style.background = '#fafbfc';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // 파일 선택 이벤트
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // 파일 업로드 처리
    function handleFileUpload(file) {
        // 파일 형식 검증
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            alert('PDF, JPG, PNG 파일만 업로드 가능합니다.');
            return;
        }
        
        // 파일 크기 검증 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB를 초과할 수 없습니다.');
            return;
        }
        
        // 파일 정보 표시
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        
        // UI 업데이트
        fileUploadArea.style.display = 'none';
        uploadedFile.style.display = 'flex';
    }
    
    // 파일 제거
    removeFileBtn.addEventListener('click', function() {
        resetFileUpload();
    });
    
    // 파일 업로드 초기화
    function resetFileUpload() {
        fileInput.value = '';
        fileUploadArea.style.display = 'block';
        uploadedFile.style.display = 'none';
    }
    
    // 파일 크기 포맷팅
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 폼 유효성 검사
    function validateForm() {
        const businessNumber = document.getElementById('business-number').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;
        const companyName = document.getElementById('company-name').value;
        const managerName = document.getElementById('manager-name').value;
        const phone = document.getElementById('phone').value;
        const email = document.getElementById('email').value;
        const serviceTerms = document.getElementById('service-terms').checked;
        const privacyTerms = document.getElementById('privacy-terms').checked;
        
        // 사업자번호 형식 검증 (10자리 숫자)
        const businessNumberPattern = /^\d{3}-\d{2}-\d{5}$|^\d{10}$/;
        if (!businessNumberPattern.test(businessNumber.replace(/-/g, ''))) {
            alert('사업자번호를 올바르게 입력해주세요.');
            return false;
        }
        
        // 비밀번호 형식 검증
        const passwordPattern = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$%*?&#])[A-Za-z\d@$%*?&#]{8,20}$/;
        if (!passwordPattern.test(password)) {
            alert('비밀번호는 영문, 숫자, 특수문자를 포함하여 8~20자리로 입력해주세요.');
            return false;
        }
        
        // 비밀번호 확인
        if (password !== passwordConfirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return false;
        }
        
        // 전화번호 형식 검증
        const phonePattern = /^01[0-9]-\d{3,4}-\d{4}$|^01[0-9]\d{7,8}$/;
        if (!phonePattern.test(phone.replace(/-/g, ''))) {
            alert('전화번호를 올바르게 입력해주세요.');
            return false;
        }
        
        // 이메일 형식 검증
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            alert('이메일을 올바르게 입력해주세요.');
            return false;
        }
        
        // 약관 동의 확인
        if (!serviceTerms || !privacyTerms) {
            alert('필수 약관에 동의해주세요.');
            return false;
        }
        
        // 광고대행사 선택 시 사업자등록증 확인
        const selectedType = document.querySelector('.type-card.active').dataset.type;
        if (selectedType === 'agency' && !fileInput.files.length) {
            alert('사업자등록증을 업로드해주세요.');
            return false;
        }
        
        return true;
    }
    
    // 폼 제출 처리
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            // 여기에 실제 서버 전송 로직 구현
            alert('회원가입이 완료되었습니다!');
            
            // 폼 데이터 수집 (예시)
            const formData = new FormData();
            const selectedType = document.querySelector('.type-card.active').dataset.type;
            
            formData.append('advertiserType', selectedType);
            formData.append('businessNumber', document.getElementById('business-number').value);
            formData.append('password', document.getElementById('password').value);
            formData.append('companyName', document.getElementById('company-name').value);
            formData.append('managerName', document.getElementById('manager-name').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('website', document.getElementById('website').value);
            
            if (selectedType === 'agency' && fileInput.files.length) {
                formData.append('businessLicense', fileInput.files[0]);
            }
            
            // 실제 구현 시에는 서버로 formData 전송
            console.log('Form data ready to submit:', formData);
        }
    });
    
    // 입력 필드 실시간 포맷팅
    document.getElementById('business-number').addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length >= 3) {
            value = value.slice(0, 3) + '-' + value.slice(3);
        }
        if (value.length >= 6) {
            value = value.slice(0, 6) + '-' + value.slice(6, 11);
        }
        e.target.value = value;
    });
    
    document.getElementById('phone').addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value.length >= 3) {
            if (value.length >= 7) {
                value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
            } else {
                value = value.slice(0, 3) + '-' + value.slice(3);
            }
        }
        e.target.value = value;
    });
});