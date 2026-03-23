class BatchUPIOCRDetector {
    constructor() {
        this.tesseractWorker = null;
        this.files = [];
        this.results = [];
        this.init();
    }

    async init() {
        await this.initOCR();
        this.setupSingleUpload();
        this.setupBatchUpload();
        this.setupDragDrop();
    }

    async initOCR() {
        this.tesseractWorker = await Tesseract.createWorker('eng');
        await this.tesseractWorker.setParameters({
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹Rs.PaidSuccessUPIIDGpayPhonePePaytmAmountTXN',
        });
    }

    setupSingleUpload() {
        document.getElementById('singleFileInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.processSingleFile(e.target.files[0]);
            }
        });
    }

    setupBatchUpload() {
        document.getElementById('batchFileInput').addEventListener('change', (e) => {
            this.files = Array.from(e.target.files);
            this.processBatch();
        });
    }

    setupDragDrop() {
        const dropZone = document.getElementById('batchUpload');
        ['dragover', 'dragenter'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            this.processBatch();
        });
    }

    async processSingleFile(file) {
        // Single file logic (previous code)
        console.log('Single file:', file.name);
    }

    async processBatch() {
        if (this.files.length === 0) return;

        this.showBatchProgress();
        this.results = [];

        document.getElementById('fileQueue').innerHTML = '';

        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            this.updateFileQueue(i, file.name, '⏳ Scanning...');
            
            try {
                const result = await this.scanFile(file);
                this.results.push(result);
                this.updateFileQueue(i, file.name, '✅ Done');
            } catch (error) {
                this.results.push({ filename: file.name, isUPI: false, error: error.message });
                this.updateFileQueue(i, file.name, '❌ Error');
            }

            // Update progress
            const progress = ((i + 1) / this.files.length) * 100;
            this.updateBatchProgress(progress);
        }

        this.showBatchResults();
    }

    async scanFile(file) {
        const { data } = await this.tesseractWorker.recognize(file);
        const analysis = this.analyzeUPIOCR(data.text, data.confidence);
        
        return {
            filename: file.name,
            isUPI: analysis.isUPI,
            confidence: analysis.confidence,
            upiScore: analysis.upiScore,
            extractedText: data.text.substring(0, 100) + '...',
            thumb: URL.createObjectURL(file),
            keywords: analysis.keywords
        };
    }

    analyzeUPIOCR(text, confidence) {
        const normalized = text.toUpperCase();
        const keywords = ['UPI', 'GPA', 'PAID', 'SUCCESS', '₹', 'RS', 'PHONEPE', 'GPAY', 'TXN'];
        let score = 0;
        let matched = [];

        keywords.forEach(kw => {
            if (normalized.includes(kw)) {
                score += 20;
                matched.push(kw);
            }
        });

        const amountMatch = /(\₹|RS\.?|INR)\s*\d+[.,]\d{2}/.test(text);
        if (amountMatch) score += 25;

        const isUPI = score > 50;
        return {
            isUPI,
            confidence: Math.min(100, confidence),
            upiScore: Math.min(100, score),
            keywords: matched
        };
    }

    showBatchProgress() {
        document.getElementById('batchUpload').style.display = 'none';
        document.getElementById('batchProgress').style.display = 'block';
    }

    updateBatchProgress(percent) {
        document.getElementById('batchProgressFill').style.width = `${percent}%`;
        document.getElementById('batchProgressText').innerHTML = 
            `Processing ${this.files.length} files... ${percent.toFixed(0)}%`;
    }

    updateFileQueue(index, filename, status) {
        const queue = document.getElementById('fileQueue');
        queue.innerHTML += `
            <div class="file-item">
                <span>${index + 1}. ${filename}</span>
                <span class="file-status">${status}</span>
            </div>
        `;
        queue.scrollTop = queue.scrollHeight;
    }

    showBatchResults() {
        document.getElementById('batchProgress').style.display = 'none';
        document.getElementById('batchResults').style.display = 'block';

        const upiCount = this.results.filter(r => r.isUPI).length;
        const total = this.results.length;
        const accuracy = total > 0 ? ((upiCount / total) * 100).toFixed(1) : 0;

        document.getElementById('totalUPI').textContent = upiCount;
        document.getElementById('totalFiles').textContent = total;
        document.getElementById('accuracyRate').textContent = `${accuracy}%`;

        const grid = document.getElementById('resultsGrid');
        grid.innerHTML = this.results.map(result => `
            <div class="batch-result-card ${result.isUPI ? 'upi' : ''}">
                <img src="${result.thumb}" class="result-thumb" alt="${result.filename}">
                <h4>${result.filename}</h4>
                <div class="result-status ${result.isUPI ? 'success' : 'failed'}">
                    ${result.isUPI ? '✅ UPI DETECTED' : '❌ Not UPI'}
                </div>
                <div class="scores">
                    <span>UPI Score: ${result.upiScore}%</span>
                    <span>OCR: ${result.confidence}%</span>
                </div>
                ${result.keywords.length > 0 ? 
                    `<div class="keywords">Keywords: ${result.keywords.join(', ')}</div>` : 
                    `<div class="no-keywords">No UPI keywords</div>`
                }
            </div>
        `).join('');
    }
}

// Global functions
function exportCSV() {
    const detector = window.detector;
    const csv = [
        ['Filename', 'UPI Detected', 'UPI Score', 'OCR Confidence', 'Keywords'],
        ...detector.results.map(r => [
            r.filename,
            r.isUPI ? 'YES' : 'NO',
            r.upiScore,
            r.confidence,
            r.keywords.join(', ') || 'None'
        ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upi-batch-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

function clearBatch() {
    document.getElementById('batchResults').style.display = 'none';
    document.getElementById('batchUpload').style.display = 'block';
    document.getElementById('batchFileInput').value = '';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.detector = new BatchUPIOCRDetector();
});
