class BatchUPIOCRDetector {
    constructor() {
        this.worker = null;
        this.init();
    }

    async init() {
        console.log("Initializing OCR...");
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
            console.error("OCR INIT ERROR:", e);
        }
    }

    setupUpload() {
        const input = document.getElementById('batchFileInput');

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            console.log("Files:", files);

            this.processBatch(files);
        });
    }

    async processBatch(files) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            document.getElementById('progress').innerHTML =
                `Processing ${i + 1}/${files.length}...`;

            try {
                const result = await this.scanFile(file);
                this.showResult(result);
            } catch (err) {
                console.error("Error:", err);
            }
        }

        document.getElementById('progress').innerHTML = "✅ Done";
    }

    async scanFile(file) {
        console.log("Processing:", file.name);

        const { data } = await this.worker.recognize(file);

        return this.analyze(data.text, file);
    }

    analyze(text, file) {
        const t = text.toUpperCase();

        let score = 0;

        if (t.includes("UPI")) score += 20;
        if (t.includes("SUCCESS")) score += 20;
        if (t.includes("₹") || t.includes("RS")) score += 20;
        if (t.includes("TXN")) score += 20;
        if (t.includes("@")) score += 20;

        const isUPI = score >= 60;

        return {
            file,
            isUPI,
            score,
            text: text.substring(0, 100)
        };
    }

    showResult(result) {
        const div = document.createElement("div");

        div.innerHTML = `
            <p><b>${result.file.name}</b></p>
            <p>${result.isUPI ? "✅ UPI DETECTED" : "❌ NOT UPI"}</p>
            <p>Score: ${result.score}</p>
            <hr>
        `;

        document.getElementById('results').appendChild(div);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new BatchUPIOCRDetector();
});
