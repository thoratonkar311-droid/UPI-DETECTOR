// Add to top of <head> in index.html
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.5.0/dist/tf.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js"></script>

class UPIProDetector {
    constructor() {
        this.tesseractWorker = null;
        this.model = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing PRO Detector...');
        
        // Load ML Model
        await this.loadMLModel();
        
        // Load OCR
        await this.initOCR();
        
        console.log('✅ PRO Detector Ready!');
    }

    async loadMLModel() {
        try {
            // Simple CNN for UPI pattern detection
            this.model = await tf.loadLayersModel('https://your-model-url/model.json');
            // Or use MobileNet for feature extraction
            // this.model = await tf.loadLayersModel('https://tfhub.dev/tensorflow/tfjs-model/mobilenet_v2_100_224/feature_vector/4/model.json');
        } catch (e) {
            console.log('Using rule-based fallback (no ML model)');
        }
    }

    async initOCR() {
        this.tesseractWorker = await Tesseract.createWorker('eng');
        await this.tesseractWorker.setParameters({
            tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz₹Rs.PaidSuccessUPIIDGpayPhonePePaytmAmountTXN',
        });
    }

    async ultimateScan(imageFile) {
        const results = {
            ocr: await this.runOCR(imageFile),
            ml: await this.runML(imageFile),
            visual: this.analyzeVisual(imageFile)
        };

        return this.combineResults(results);
    }

    async runOCR(imageFile) {
        const { data } = await this.tesseractWorker.recognize(imageFile);
        return {
            text: data.text,
            confidence: data.confidence,
            words: data.words
        };
    }

    async runML(imageFile) {
        if (!this.model) return { confidence: 50 };
        
        const img = await this.preprocessImage(imageFile);
        const prediction = this.model.predict(img);
        const confidence = await prediction.data();
        
        return { confidence: confidence[0] * 100 };
    }

    preprocessImage(imageFile) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const tensor = tf.browser.fromPixels(img)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat()
                    .div(255.0)
                    .expandDims();
                resolve(tensor);
            };
            img.src = URL.createObjectURL(imageFile);
        });
    }

    // ... rest of previous methods
}
