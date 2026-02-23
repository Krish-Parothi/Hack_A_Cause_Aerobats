# from ultralytics import YOLO

# model = YOLO("Model/runs/yolov8_custom4/weights/best.pt")

# results = model("testing/test_images/test.jpg", conf=0.3, save=True)

# print(results)
from ultralytics import YOLO
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model = YOLO(os.path.join(BASE_DIR, "Model", "runs", "yolov8_custom4", "weights", "best.pt"))

results = model(
    os.path.join(BASE_DIR, "testing", "test_images", "test3.jpg"),
    conf=0.3,
    save=True,
    project=os.path.join(BASE_DIR, "testing", "output"),  # save folder
    name="results"  # subfolder name
)

print(results)