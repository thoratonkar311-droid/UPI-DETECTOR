import pytesseract
import cv2
import os
import pandas as pd

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

DATASET_PATH = "dataset"
data = []

def extract_features(image_path, label):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    text = pytesseract.image_to_string(gray)
    text_upper = text.upper()

    has_upi = int("UPI" in text_upper)
    has_success = int("SUCCESS" in text_upper)
    has_rupee = int("₹" in text or "RS" in text_upper)

    has_txn = int(any(char.isdigit() for char in text))
    has_upi_id = int("@" in text)

    return [has_upi, has_success, has_rupee, has_txn, has_upi_id, label]

for category in ["real", "fake"]:
    folder = os.path.join(DATASET_PATH, category)

    for file in os.listdir(folder):
        path = os.path.join(folder, file)

        if path.endswith((".png", ".jpg", ".jpeg")):
            label = 1 if category == "real" else 0
            features = extract_features(path, label)
            data.append(features)

df = pd.DataFrame(data, columns=[
    "has_upi", "has_success", "has_rupee",
    "has_txn", "has_upi_id", "label"
])

df.to_csv("upi_dataset.csv", index=False)

print("✅ CSV CREATED: upi_dataset.csv")
