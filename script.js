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
        try {
            this.worker = await Tesseract.createWorker({
                logger: m => console.log(m)
            });

            await this.worker.loadLanguage('eng');
            await this.worker.initialize('eng');

            console.log("✅ OCR Ready");
        } catch (e) {
            console.error("❌ OCR INIT ERROR:", e);
        }
    }

    setupUpload() {
        const input = document.getElementById('batchFileInput');

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            console.log("📂 Files selected:", files);

            document.getElementById('results').innerHTML = "";
            this.processBatch(files);
        });
    }

    async processBatch(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            document.getElementById('progress').innerHTML =
                `⏳ Processing ${i + 1}/${files.length}...`;

            try {
                const result = await this.scanFile(file);
                this.showResult(result);
            } catch (err) {
                console.error("❌ Error:", err);
            }
        }

        document.getElementById('progress').innerHTML = "✅ Done";
    }

    async scanFile(file) {
        console.log("🔍 Processing:", file.name);

        const { data } = await this.worker.recognize(file);
        return this.analyze(data.text, file);
    }

    // 🔥 ADVANCED ANALYSIS (OCR + FRAUD LOGIC)
    analyze(text, file) {
        const t = text.toUpperCase();

        let score = 0;
        let reasons = [];

        // ✅ Basic UPI signals
        if (t.includes("UPI")) { score += 20; reasons.push("UPI found"); }
        if (t.includes("SUCCESS")) { score += 20; reasons.push("Success status"); }
        if (t.includes("₹") || t.includes("RS")) { score += 20; reasons.push("Amount detected"); }
        if (t.includes("TXN") || t.includes("TRANSACTION")) { score += 20; reasons.push("Transaction ID"); }
        if (t.includes("@")) { score += 20; reasons.push("UPI ID"); }

        const isUPI = score >= 60;

        // 🔍 FRAUD DETECTION LOGIC

        // 1. Transaction ID format check
        const txnRegex = /(UPI|TXN|ID)[\s:-]*([A-Z0-9]{8,})/i;
        const validTxn = txnRegex.test(t);

        // 2. Amount consistency
        const amounts = t.match(/₹\s*\d+/g);
        const amountConsistency = amounts && amounts.length >= 1;

        // 3. UPI ID check
        const hasUPIid = /[a-zA-Z0-9._-]+@[a-zA-Z]+/.test(t);

        // 4. App detection
        let app = "Unknown";
        if (t.includes("GOOGLE PAY") || t.includes("GPAY")) app = "GPay";
        else if (t.includes("PHONEPE")) app = "PhonePe";
        else if (t.includes("PAYTM")) app = "Paytm";

        // 🔥 Final Fraud Score
        let fraudScore = 0;

        if (!validTxn) fraudScore += 30;
        if (!amountConsistency) fraudScore += 20;
        if (!hasUPIid) fraudScore += 20;
        if (app === "Unknown") fraudScore += 10;

        // Final decision
        const isReal = isUPI && fraudScore < 40;

        return {
            file,
            isUPI,
            isReal,
            score,
            fraudScore,
            app,
            reasons,
            text: text.substring(0, 120)
        };
    }

    // 🎨 UI OUTPUT
    showResult(result) {
        const div = document.createElement("div");

        div.style.border = "2px solid #ccc";
        div.style.padding = "15px";
        div.style.margin = "10px";
        div.style.borderRadius = "10px";

        div.innerHTML = `
            <h3>${result.file.name}</h3>

            <p><b>UPI Detection:</b> ${result.isUPI ? "✅ YES" : "❌ NO"}</p>

            <p><b>Fraud Status:</b> 
                ${result.isReal ? 
                    "🟢 REAL (LOW RISK)" : 
                    "🔴 FAKE / SUSPICIOUS"}
            </p>

            <p><b>UPI Score:</b> ${result.score}</p>
            <p><b>Fraud Score:</b> ${result.fraudScore}</p>
            <p><b>App Detected:</b> ${result.app}</p>

            <p><b>Reasons:</b> ${result.reasons.join(", ")}</p>

            <details>
                <summary>📄 Extracted Text</summary>
                <p>${result.text}</p>
            </details>

            <hr>
        `;

        document.getElementById('results').appendChild(div);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new BatchUPIOCRDetector();
});
