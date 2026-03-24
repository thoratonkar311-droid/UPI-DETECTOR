class BatchUPIOCRDetector {
    constructor() {
        this.tesseractWorker = null;
        this.model = null;
        this.files = [];
        this.results = [];
        this.init();
    }

    async init() {
        await this.initOCR();
        await this.loadModel(); // ✅ STEP 4: Model called here
        this.setupSingleUpload();
        this.setupBatchUpload();
        this.setupDragDrop();
    }

    async initOCR() {
        this.tesseractWorker = await Tesseract.createWorker('eng');
        await this.tesseractWorker.setParameters({
            tessedit_char_whitelist:
                '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹Rs.PaidSuccessUPIIDGpayPhonePePaytmAmountTXN@.-',
        });
    }

    // ✅ STEP 3: Load ML Model
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('model/model.json');
            console.log("✅ Real ML Model Loaded");
        } catch (error) {
            console.log("⚠️ Using fallback model");

            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ units: 16, inputShape: [3], activation: 'relu' }));
            this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
            this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

            this.model.compile({
                optimizer: 'adam',
                loss: 'binaryCrossentropy',
                metrics: ['accuracy']
            });
        }
    }

    // ✅ Feature extraction
    extractFeatures(analysis) {
        return [
            analysis.upiScore / 100,
            analysis.confidence / 100,
            analysis.keywords.length / 10
        ];
    }

    // ✅ ML Prediction
    async predictFake(analysis) {
        const features = this.extractFeatures(analysis);
        const input = tf.tensor2d([features]);
        const prediction = this.model.predict(input);
        return prediction.dataSync()[0];
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
                this.results.push({ filename: file.name, isUPI: false });
                this.updateFileQueue(i, file.name, '❌ Error');
            }

            const progress = ((i + 1) / this.files.length) * 100;
            this.updateBatchProgress(progress);
        }

        this.showBatchResults();
    }

    async scanFile(file) {
        const { data } = await this.tesseractWorker.recognize(file);

        const analysis = this.analyzeUPIOCR(data.text, data.confidence);

        // 🔥 Combine OCR + ML
        const mlScore = await this.predictFake(analysis);
        const finalDecision = analysis.isUPI && mlScore > 0.5;

        return {
            filename: file.name,
            isUPI: finalDecision,
            confidence: analysis.confidence,
            upiScore: analysis.upiScore,
            mlScore: (mlScore * 100).toFixed(1),
            thumb: URL.createObjectURL(file),
            keywords: analysis.keywords
        };
    }

    analyzeUPIOCR(text, confidence) {
        const normalized = text.toUpperCase();
        let score = 0;
        let matched = [];

        const keywords = ['UPI', 'PAID', 'SUCCESS', '₹', 'PHONEPE', 'GPAY', 'PAYTM'];

        keywords.forEach(kw => {
            if (normalized.includes(kw)) {
                score += 10;
                matched.push(kw);
            }
        });

        const txnPattern = /\b\d{12,16}\b/;
        const hasTxn = txnPattern.test(text);
        if (hasTxn) {
            score += 30;
            matched.push("VALID_TXN");
        }

        const upiIdPattern = /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/;
        const hasUPIID = upiIdPattern.test(text);
        if (hasUPIID) {
            score += 25;
            matched.push("UPI_ID");
        }

        const amountMatch = /(\₹|RS\.?|INR)\s*\d+([.,]\d{1,2})?/.test(text);
        if (amountMatch) score += 15;

        if (!hasTxn && score > 40) score -= 30;

        const isUPI = score > 70 && hasTxn && hasUPIID;

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
    }

    showBatchResults() {
        document.getElementById('batchProgress').style.display = 'none';
        document.getElementById('batchResults').style.display = 'block';

        const grid = document.getElementById('resultsGrid');

        grid.innerHTML = this.results.map(result => `
            <div class="batch-result-card ${result.isUPI ? 'upi' : ''}">
                <img src="${result.thumb}" class="result-thumb">
                <h4>${result.filename}</h4>

                <div class="result-status ${result.isUPI ? 'success' : 'failed'}">
                    ${result.isUPI ? '✅ REAL UPI' : '❌ FAKE'}
                </div>

                <div class="scores">
                    <span>UPI: ${result.upiScore}%</span>
                    <span>ML: ${result.mlScore}%</span>
                </div>
            </div>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.detector = new BatchUPIOCRDetector();
});
