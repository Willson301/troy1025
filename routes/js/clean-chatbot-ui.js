
        // 챗봇 상태 관리
        let chatState = {
            currentState: 'greeting',
            userId: 'test_user_001',
            userName: '테스트유저',
            cart: [],
            currentItem: {},
            exchangeRate: { base: 0, adjusted: 0 },
            testData: []
        };

        // 초기 인사 메시지 표시
        window.onload = function() {
            showGreeting();
        };

        async function showGreeting() {
            await getExchangeRate();
            
            const greeting = `안녕하세요! SHIPGU 결제 시스템입니다.

환율 정보 (1위안 기준)
• 기본 환율: ${chatState.exchangeRate.base.toFixed(2)}원
• 적용 환율: ${chatState.exchangeRate.adjusted.toFixed(2)}원 (+7원 추가)

결제 방식을 선택해주세요:`;

            addBotMessage(greeting, [
                { text: "QR코드 결제", payload: "qr_payment" },
                { text: "계좌이체 결제", payload: "bank_transfer" }
            ]);
            
            chatState.currentState = 'payment_method_selection';
            updateTestData();
        }

        async function getExchangeRate() {
            try {
                const baseRate = 199.50;
                const adjustedRate = baseRate + 7;
                
                chatState.exchangeRate.base = baseRate;
                chatState.exchangeRate.adjusted = adjustedRate;
                
            } catch (error) {
                console.error('환율 정보를 가져오는데 실패했습니다:', error);
                chatState.exchangeRate.base = 199.50;
                chatState.exchangeRate.adjusted = 206.50;
            }
        }

        function addBotMessage(message, quickReplies = []) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            
            let html = `<div class="bot-message">${message}</div>`;
            
            if (quickReplies.length > 0) {
                html += '<div class="quick-replies">';
                quickReplies.forEach(reply => {
                    html += `<button class="quick-reply-btn" onclick="handleQuickReply('${reply.payload}')">${reply.text}</button>`;
                });
                html += '</div>';
            }
            
            messageDiv.innerHTML = html;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function addUserMessage(message) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.innerHTML = `<div class="user-message">${message}</div>`;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function handleQuickReply(payload) {
            if (payload === 'qr_payment') {
                addUserMessage('QR코드 결제');
                addBotMessage('QR코드 결제를 선택하셨습니다.\n\n결제하실 QR코드 이미지를 업로드해주세요.');
                showFileUpload();
                chatState.currentState = 'qr_upload';
                updateTestData();
            } else if (payload === 'bank_transfer') {
                addUserMessage('계좌이체 결제');
                addBotMessage('계좌이체 결제를 선택하셨습니다.\n\n아래 순서대로 정보를 입력해주세요:\n\n1. 계좌번호\n2. 수취인명\n3. 은행이름\n4. 은행지점 (예: 000支行)\n5. 결제금액\n\n중국어로 입력해주셔도 무방합니다.\n\n예시:\n6228480012345678901\n张三\n中国工商银行\n上海分行\n200');
                chatState.currentState = 'bank_transfer_input';
                updateTestData();
            } else if (payload === 'proceed_payment') {
                addUserMessage('결제하기');
                addBotMessage('결제할 상품이 무엇인가요?\n예) 가방, 신발, 의류 등');
                chatState.currentState = 'product_name_input';
                updateTestData();
            } else if (payload === 'add_more') {
                addUserMessage('추가 결제하기');
                addBotMessage('추가할 결제 방식을 선택해주세요:', [
                    { text: "QR코드 결제", payload: "qr_payment" },
                    { text: "계좌이체 결제", payload: "bank_transfer" }
                ]);
                chatState.currentState = 'payment_method_selection';
                updateTestData();
            }
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (message === '') return;
            
            addUserMessage(message);
            input.value = '';
            
            processUserMessage(message);
        }

        function processUserMessage(message) {
            if (chatState.currentState === 'amount_input') {
                handleAmountInput(message);
            } else if (chatState.currentState === 'product_name_input') {
                handleProductNameInput(message);
            } else if (chatState.currentState === 'bank_transfer_input') {
                handleBankTransferInput(message);
            }
        }

        function handleAmountInput(message) {
            const amountMatch = message.match(/(\d+(?:\.\d+)?)/);
            
            if (!amountMatch) {
                addBotMessage('올바른 금액을 입력해주세요. 예) 200 (위안화)');
                return;
            }
            
            const cnyAmount = parseFloat(amountMatch[0]);
            const krwAmount = Math.ceil(cnyAmount * chatState.exchangeRate.adjusted);
            
            const cartItem = {
                id: Date.now().toString(),
                qrImagePath: chatState.currentItem.qrImagePath || 'test_qr.jpg',
                cnyAmount: cnyAmount,
                krwAmount: krwAmount,
                timestamp: new Date().toISOString()
            };
            
            chatState.cart.push(cartItem);
            
            const messageText = `장바구니에 추가되었습니다.

위안화: ${cnyAmount}위안
한화: ${krwAmount.toLocaleString()}원
환산기준: ${chatState.exchangeRate.base.toFixed(2)}원 + 7원 = ${chatState.exchangeRate.adjusted.toFixed(2)}원/위안

결제를 계속 진행하시겠습니까?`;

            addBotMessage(messageText, [
                { text: "결제하기", payload: "proceed_payment" },
                { text: "추가 결제하기", payload: "add_more" }
            ]);
            
            chatState.currentState = 'cart_options';
            updateTestData();
        }

        function handleBankTransferInput(message) {
            const lines = message.trim().split('\n');
            
            if (lines.length < 5) {
                addBotMessage('정보가 부족합니다. 5줄로 입력해주세요:\n\n1. 계좌번호\n2. 수취인명\n3. 은행이름\n4. 은행지점\n5. 결제금액');
                return;
            }
            
            const bankInfo = {
                accountNumber: lines[0].trim(),
                accountHolder: lines[1].trim(),
                bankName: lines[2].trim(),
                bankBranch: lines[3].trim(),
                amount: parseFloat(lines[4].trim()) || 0
            };
            
            if (bankInfo.amount <= 0) {
                addBotMessage('결제금액을 올바르게 입력해주세요.');
                return;
            }
            
            const krwAmount = Math.ceil(bankInfo.amount * chatState.exchangeRate.adjusted);
            
            const messageText = `계좌이체 정보가 접수되었습니다.

계좌번호: ${bankInfo.accountNumber}
수취인명: ${bankInfo.accountHolder}  
은행정보: ${bankInfo.bankName} ${bankInfo.bankBranch}
결제금액: ${bankInfo.amount}위안 (${krwAmount.toLocaleString()}원)

결제를 계속 진행하시겠습니까?`;

            const cartItem = {
                id: Date.now().toString(),
                paymentMethod: 'bank_transfer',
                bankInfo: bankInfo,
                cnyAmount: bankInfo.amount,
                krwAmount: krwAmount,
                timestamp: new Date().toISOString()
            };
            
            chatState.cart.push(cartItem);
            
            addBotMessage(messageText, [
                { text: "결제하기", payload: "proceed_payment" },
                { text: "추가 결제하기", payload: "add_more" }
            ]);
            
            chatState.currentState = 'cart_options';
            updateTestData();
        }

        function handleProductNameInput(message) {
            const productName = message.trim();
            
            chatState.cart.forEach(item => {
                item.productName = productName;
            });
            
            const totalAmount = chatState.cart.reduce((sum, item) => sum + item.krwAmount, 0);
            
            const banks = ["국민은행", "신한은행", "우리은행", "하나은행"];
            const bank = banks[Math.floor(Math.random() * banks.length)];
            const account = `${Math.floor(Math.random() * 900000) + 100000}-${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 900000) + 100000}`;
            
            const expireTime = new Date();
            expireTime.setMinutes(expireTime.getMinutes() + 30);
            
            const messageText = `주문이 접수되었습니다.

상품명: ${productName}
총 결제금액: ${totalAmount.toLocaleString()}원
가상계좌: ${bank} ${account}
입금기한: ${expireTime.toLocaleString('ko-KR', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit'
            })}

입금 완료 후 자동으로 결제가 진행됩니다.`;

            addBotMessage(messageText);
            
            chatState.testData.push({
                timestamp: new Date().toISOString(),
                userId: chatState.userId,
                userName: chatState.userName,
                cart: [...chatState.cart],
                totalAmount: totalAmount,
                virtualAccount: { bank, account, expireTime }
            });
            
            chatState.cart = [];
            chatState.currentItem = {};
            chatState.currentState = 'greeting';
            
            addBotMessage('완료! 새로운 주문을 시작하시려면 "시작"이라고 말해주세요.');
            updateTestData();
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    chatState.currentItem.qrImagePath = file.name;
                    chatState.currentItem.qrImageData = e.target.result;
                    
                    addUserMessage(`${file.name} 업로드 완료`);
                    addBotMessage('QR코드가 업로드되었습니다.\n\n이 QR코드로 결제할 위안화 금액을 입력해주세요.\n예: 200 (200위안 결제)');
                    
                    hideFileUpload();
                    chatState.currentState = 'amount_input';
                    updateTestData();
                };
                reader.readAsDataURL(file);
            }
        }

        function showFileUpload() {
            document.getElementById('fileUpload').style.display = 'block';
        }

        function hideFileUpload() {
            document.getElementById('fileUpload').style.display = 'none';
        }

        function updateTestData() {
            document.getElementById('userState').textContent = chatState.currentState;
            document.getElementById('cartItems').textContent = `${chatState.cart.length}개`;
            document.getElementById('exchangeRate').textContent = `${chatState.exchangeRate.adjusted.toFixed(2)}원/위안 (${chatState.exchangeRate.base.toFixed(2)} + 7)`;
            
            if (chatState.cart.length > 0) {
                const totalCNY = chatState.cart.reduce((sum, item) => sum + item.cnyAmount, 0);
                const totalKRW = chatState.cart.reduce((sum, item) => sum + item.krwAmount, 0);
                document.getElementById('cartItems').textContent += ` (${totalCNY}위안 = ${totalKRW.toLocaleString()}원)`;
            }
        }

        function resetChat() {
            document.getElementById('messages').innerHTML = '';
            chatState = {
                currentState: 'greeting',
                userId: 'test_user_001',
                userName: '테스트유저',
                cart: [],
                currentItem: {},
                exchangeRate: { base: 0, adjusted: 0 },
                testData: []
            };
            hideFileUpload();
            showGreeting();
        }

        // Enter 키로 메시지 전송
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // 자동 테스트 (콘솔에서 runAutoTest() 호출)
        console.log('자동 테스트 실행: runAutoTest()');
    

