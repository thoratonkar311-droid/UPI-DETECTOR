import pytesseract
import cv2
import os
import pandas as pd

# 🔥 STEP 4: CONNECT TESSERACT WITH PYTHON (IMPORTANT)
# Change path if your installation is different
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Dataset folder
DATASET_PATH = "dataset"

# Store data
data = []

def extract_features(image_path, label):
    try:
        # Read image
        img = cv2.imread(image_path)

        if img is None:
            print(f"❌ Cannot read: {image_path}")
            return None

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # OCR
        text = pytesseract.image_to_string(gray)
        text_upper = text.upper()

        # 🔍 FEATURE EXTRACTION
        has_upi = int("UPI" in text_upper)
        has_success = int("SUCCESS" in text_upper)
        has_rupee = int("₹" in text or "RS" in text_upper or "INR" in text_upper)

        # Transaction detection
        has_txn = int(any(char.isdigit() for char in text))

        # UPI ID detection
        has_upi_id = int("@" in text)

        return [has_upi, has_success, has_rupee, has_txn, has_upi_id, label]

    except Exception as e:
        print(f"❌ Error processing {image_path}: {e}")
        return None


# 🔁 LOOP THROUGH DATASET
for category in ["real", "fake"]:
    folder = os.path.join(DATASET_PATH, category)

    if not os.path.exists(folder):
        print(f"❌ Folder not found: {folder}")
        continue

    for file in os.listdir(folder):
        path = os.path.join(folder, file)

        if path.lower().endswith((".png", ".jpg", ".jpeg")):
            label = 1 if category == "real" else 0

            features = extract_features(path, label)

            if features:
                data.append(features)


# 📊 CREATE DATAFRAME
df = pd.DataFrame(data, columns=[
    "has_upi",
    "has_success",
    "has_rupee",
    "has_txn",
    "has_upi_id",
    "label"
])

# 💾 SAVE CSV
df.to_csv("upi_dataset.csv", index=False)

print("✅ SUCCESS: upi_dataset.csv created!")
print(f"📊 Total samples: {len(df)}")
