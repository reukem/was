import { ChatMessage, Quest } from '../types';

interface ReportData {
    studentName: string;
    className: string;
    date: string;
    safetyScore: number;
    quests: Quest[];
    transcript: ChatMessage[];
}

export const generateReport = (data: ReportData) => {
    const formatTime = () => {
        const d = new Date();
        return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const completedQuests = data.quests.filter(q => q.isCompleted);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <title>Báo Cáo Thực Hành Hóa Học</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
            body {
                font-family: 'Times New Roman', serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.6;
                color: #000;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #000;
                padding-bottom: 20px;
            }
            .header h1 {
                font-size: 24px;
                font-weight: bold;
                text-transform: uppercase;
                margin: 0;
            }
            .header p {
                margin: 5px 0;
                font-size: 14px;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 30px;
            }
            .info-item {
                border-bottom: 1px dotted #ccc;
                padding-bottom: 5px;
            }
            .section {
                margin-bottom: 30px;
            }
            .section-title {
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1px solid #000;
                padding-bottom: 5px;
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
            }
            .score-box {
                border: 2px solid #000;
                padding: 15px;
                text-align: center;
                margin-bottom: 20px;
                background: #f9f9f9;
            }
            .score-value {
                font-size: 32px;
                font-weight: bold;
            }
            .quest-list {
                list-style: none;
                padding: 0;
            }
            .quest-item {
                padding: 8px 0;
                border-bottom: 1px dashed #eee;
                display: flex;
                justify-content: space-between;
            }
            .transcript {
                background: #fff;
                font-size: 14px;
            }
            .msg {
                margin-bottom: 10px;
                padding: 8px;
                border-left: 3px solid #eee;
            }
            .msg.user { border-left-color: #6366f1; background: #eff6ff; }
            .msg.model { border-left-color: #10b981; background: #f0fdf4; }
            .msg-role { font-weight: bold; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }

            @media print {
                body { padding: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <p>SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
            <h1>BÁO CÁO THỰC HÀNH HÓA HỌC</h1>
            <p>Môn: Hóa Học • Lớp: ${data.className || '___'}</p>
        </div>

        <div class="info-grid">
            <div class="info-item"><strong>Họ và tên:</strong> ${data.studentName || '____________________'}</div>
            <div class="info-item"><strong>Ngày thực hành:</strong> ${data.date}</div>
            <div class="info-item"><strong>Thời gian nộp:</strong> ${formatTime()}</div>
            <div class="info-item"><strong>Giáo viên hướng dẫn:</strong> Giáo Sư Lucy (AI)</div>
        </div>

        <div class="section">
            <div class="section-title">I. KẾT QUẢ ĐÁNH GIÁ</div>
            <div class="score-box">
                <div style="font-size: 14px; text-transform: uppercase;">Điểm An Toàn</div>
                <div class="score-value" style="color: ${data.safetyScore < 50 ? '#ef4444' : '#10b981'}">
                    ${data.safetyScore}/100
                </div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Hoàn thành nhiệm vụ: ${completedQuests.length}/${data.quests.length}
                </div>
            </div>

            <h3>Chi Tiết Nhiệm Vụ:</h3>
            <ul class="quest-list">
                ${data.quests.map(q => `
                    <li class="quest-item">
                        <span>${q.title}</span>
                        <span style="color: ${q.isCompleted ? '#10b981' : '#9ca3af'}">
                            ${q.isCompleted ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}
                        </span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="section">
            <div class="section-title">II. NHẬT KÝ THÍ NGHIỆM (TRANSCRIPT)</div>
            <div class="transcript">
                ${data.transcript.map(m => `
                    <div class="msg ${m.role}">
                        <div class="msg-role">${m.role === 'user' ? 'Học Sinh' : 'Giáo Sư Lucy'}</div>
                        <div>${m.text.replace(/\n/g, '<br>')}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section" style="margin-top: 50px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; text-align: center;">
                <div style="width: 40%">
                    <p><strong>Học sinh ký tên</strong></p>
                    <br><br><br>
                    <p>${data.studentName || '....................'}</p>
                </div>
                <div style="width: 40%">
                    <p><strong>Giáo viên chấm điểm</strong></p>
                    <br><br><br>
                    <p>____________________</p>
                </div>
            </div>
        </div>

        <script>
            window.onload = function() { window.print(); }
        </script>
    </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } else {
        alert("Vui lòng cho phép popup để xuất báo cáo!");
    }
};
