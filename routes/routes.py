from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import base64
import os
import cv2
import numpy as np
from ultralytics import YOLO
from io import BytesIO
from PIL import Image

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model = YOLO(os.path.join(BASE_DIR, "Model", "runs", "yolov8_custom4", "weights", "best.pt"))

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    # Image read karo client se
    contents = await file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    # Model se detect karo
    results = model(img, conf=0.3)

    # Detected image plot karo
    detected_img = results[0].plot()  # bounding boxes ke saath image

    # Base64 mein convert karo
    _, buffer = cv2.imencode(".jpg", detected_img)
    encoded_img = base64.b64encode(buffer).decode("utf-8")

    # Detection details bhi bhejo
    detections = []
    for box in results[0].boxes:
        detections.append({
            "class": model.names[int(box.cls)],
            "confidence": float(box.conf),
            "bbox": box.xyxy[0].tolist()  # [x1, y1, x2, y2]
        })

    return JSONResponse({
        "image_base64": encoded_img,
        "detections": detections,
        "total_detections": len(detections)
    })