class UPIFakeDetector {
    constructor() {
        this.model = null;
        this.imageSize = 224;
        this.isModelLoaded = false;

        this.init();
    }

    async init() {
        this.updateStatus("⏳ Loading AI model...");
        await this.loadModel();
        this.setupUpload();
    }

    // ✅ Load trained model
    async loadModel() {
        try {
            this.model = await tf.loadLayersModel('model/model.json');
            this.isModelLoaded = true;
            this.updateStatus("✅ Model loaded. Upload image.");
            console.log("Model Loaded");
        } catch (err) {
            console.error(err);
            this.updateStatus("❌ Model not found (model/model.json)");
        }
    }

    // ✅ Upload handler
    setupUpload() {
        const input = document.getElementById('fileInput');

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            this.previewImage(file);

            if (!this.isModelLoaded) {
                this.updateStatus("⚠️ Model not loaded");
                return;
            }

            this.predictImage(file);
        });
    }

    // ✅ Preview image
    previewImage(file) {
        const preview = document.getElementById('preview');
        preview.src = URL.createObjectURL(file);
    }

    // ✅ Preprocess image → tensor
    async preprocessImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = this.imageSize;
                canvas.height = this.imageSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, this.imageSize, this.imageSize);

                const tensor = tf.browser.fromPixels(canvas)
                    .toFloat()
                    .div(255.0)
                    .expandDims(0);

                resolve(tensor);
            };
        });
    }

    // ✅ Prediction
    async predictImage(file) {
        this.updateStatus("🔍 Analyzing image...");

        const tensor = await this.preprocessImage(file);

        const prediction = this.model.predict(tensor);
        const score = prediction.dataSync()[0];

        tensor.dispose();
        prediction.dispose();

        this.displayResult(score);
    }

    // ✅ Show result
    displayResult(score) {
        const result = document.getElementById('result');

        const fakeConfidence = (score * 100).toFixed(2);
        const realConfidence = (100 - fakeConfidence).toFixed(2);

        if (score > 0.5) {
            result.innerHTML = `
                ❌ FAKE Screenshot <br>
                Confidence: ${fakeConfidence}%
            `;
            result.style.color = "red";
        } else {
            result.innerHTML = `
                ✅ REAL Screenshot <br>
                Confidence: ${realConfidence}%
            `;
            result.style.color = "green";
        }

        this.updateStatus("✅ Analysis complete");
    }

    updateStatus(message) {
        document.getElementById('status').innerText = message;
    }
}

// ✅ Start app
document.addEventListener('DOMContentLoaded', () => {
    new UPIFakeDetector();
});
