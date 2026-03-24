class BatchUPIOCRDetector {
    constructor() {
        this.worker = null;
        this.init();
    }

    async init() {
        console.log("🚀 Initializing OCR...");
        await this.initOCR();
        this.setupUpload();
    }

    async initOCR() {
        this.worker = await Tesseract.createWorker({
            logger: m => console.log(m)
        });

        await this.worker.loadLanguage('eng');
        await this.worker.initialize('eng');

        console.log("✅ OCR Ready");
    }

    setupUpload() {
        document.getElementById('batchFileInput').addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            document.getElementById('results').innerHTML = "";
            this.processBatch(files);
        });
    }

    async processBatch(files) {
        for (let i = 0; i < files.length; i++) {
            document.getElementById('progress').innerText =
                `⏳ Processing ${i + 1}/${files.length}`;

            const result = await this.scanFile(files[i]);
            this.showResult(result);
        }

        document.getElementById('progress').innerText = "✅ Done";
    }

    async scanFile(file) {
        const { data } = await this.worker.recognize(file);
        return this.analyze(data.text, file);
    }

    // 🔥 HYBRID ANALYSIS ENGINE
    analyze(text, file) {
        const t = text.toUpperCase();

        // ---------------------------
        // 1. OCR KEYWORD SCORE
        // ---------------------------
        let score = 0;

        if (t.includes("UPI")) score += 20;
        if (t.includes("SUCCESS")) score += 20;
        if (t.includes("₹") || t.includes("RS")) score += 20;
        if (t.includes("TXN")) score += 20;
        if (t.includes("@")) score += 20;

        const isUPI = score >= 60;

        // ---------------------------
        // 2. STRICT VALIDATION
        // ---------------------------
        const validUPIid = /[a-zA-Z0-9._-]{3,}@[a-zA-Z]{2,}/.test(text);
        const validTxn = /[A-Z0-9]{10,}/.test(t);
        const validAmount = /₹\s*\d+/.test(text);

        // suspicious patterns
        const suspiciousPattern = /(000000|111111|123456|999999)/;
        const hasFakePattern = suspiciousPattern.test(text);

        // ---------------------------
        // 3. TAMPERING HEURISTICS (Pseudo-AI)
        // ---------------------------
        let tamperScore = 0;

        // repeated characters → fake editing
        if (/(.)\1{5,}/.test(text)) tamperScore += 30;

        // inconsistent spacing (common in edits)
        if (/\s{3,}/.test(text)) tamperScore += 10;

        // weird symbols
        if (/[^a-zA-Z0-9₹@.\s:-]/.test(text)) tamperScore += 10;

        // very short text = suspicious
        if (text.length < 30) tamperScore += 20;

        // ---------------------------
        // 4. APP DETECTION
        // ---------------------------
        let app = "Unknown";

        if (t.includes("GOOGLE PAY") || t.includes("GPAY")) app = "GPay";
        else if (t.includes("PHONEPE")) app = "PhonePe";
        else if (t.includes("PAYTM")) app = "Paytm";

        if (app === "Unknown") tamperScore += 10;

        // ---------------------------
        // 5. FINAL DECISION ENGINE
        // ---------------------------
        let fraudScore = 0;

        if (!validUPIid) fraudScore += 25;
        if (!validTxn) fraudScore += 25;
        if (!validAmount) fraudScore += 20;
        if (hasFakePattern) fraudScore += 30;

        fraudScore += tamperScore;

        const isReal = isUPI && fraudScore < 40;

        // ---------------------------
        return {
            file,
            isUPI,
            isReal,
            score,
            fraudScore,
            tamperScore,
            app,
            preview: text.substring(0, 120)
        };
    }

    // 🎨 UI OUTPUT
    showResult(r) {
        const div = document.createElement("div");

        div.style.border = "2px solid #ddd";
        div.style.margin = "10px";
        div.style.padding = "15px";
        div.style.borderRadius = "10px";

        div.innerHTML = `
            <h3>${r.file.name}</h3>

            <p><b>UPI:</b> ${r.isUPI ? "✅ YES" : "❌ NO"}</p>

            <p><b>Status:</b> 
                ${r.isReal ? 
                    "🟢 REAL (LOW RISK)" : 
                    "🔴 FAKE / SUSPICIOUS"}
            </p>

            <p><b>UPI Score:</b> ${r.score}</p>
            <p><b>Fraud Score:</b> ${r.fraudScore}</p>
            <p><b>Tamper Score:</b> ${r.tamperScore}</p>
            <p><b>App:</b> ${r.app}</p>

            <details>
                <summary>📄 Extracted Text</summary>
                <p>${r.preview}</p>
            </details>

            <hr>
        `;

        document.getElementById("results").appendChild(div);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new BatchUPIOCRDetector();
});
