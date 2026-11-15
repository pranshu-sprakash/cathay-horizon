# Builds the depth layers for the photo push-in from the Commons photo
# "Cathay Pacific 77W business class seat" by Sunnya343, CC BY-SA 3.0.
# Usage: python3 scripts/prep-cabin.py <source.jpg>   (needs opencv-python-headless and numpy)
# Writes public/media/cabin/{back.jpg,fg.webp}. Coordinates are in source pixels (3264x2448).
import os
import sys
import cv2
import numpy as np

src = cv2.imread(sys.argv[1]).astype(np.float32) / 255.0
H, W = src.shape[:2]

# The photo was taken under purple mood lighting; neutralise against the wall by the window,
# then push it warm to match the evening cabin in the rest of the demo.
wall = src[60:420, 1150:1550].reshape(-1, 3).mean(0)
target = np.array([0.76, 0.86, 0.96])  # BGR, warm white
img = np.clip(src * (target / wall), 0, 1)
img = img ** 0.94
img = np.clip((img - 0.5) * 1.06 + 0.5, 0, 1)
hsv = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)
hsv[..., 1] *= 0.86
img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32) / 255.0

S = 3.1875  # traced on a 1024-wide preview
fg_poly = np.array([(0, 30), (95, 28), (210, 92), (240, 280), (500, 205), (545, 225), (545, 430), (505, 615), (560, 640), (760, 640), (785, 768), (0, 768)], np.float32) * S
fg_poly[:, 0] = np.clip(fg_poly[:, 0], 0, W)
fg_poly[:, 1] = np.clip(fg_poly[:, 1], 0, H)

mask = np.zeros((H, W), np.uint8)
cv2.fillPoly(mask, [fg_poly.astype(np.int32)], 255)
soft = cv2.GaussianBlur(mask, (0, 0), 6)

# Clean plate: inpaint the foreground at quarter size, so the parallax gap behind its edge shows wall, not a second console.
q = cv2.resize((img * 255).astype(np.uint8), (W // 4, H // 4), interpolation=cv2.INTER_AREA)
qm = cv2.dilate(cv2.resize(mask, (W // 4, H // 4), interpolation=cv2.INTER_NEAREST), np.ones((9, 9), np.uint8))
filled = cv2.inpaint(q, qm, 12, cv2.INPAINT_TELEA)
filled = cv2.GaussianBlur(cv2.resize(filled, (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 10).astype(np.float32) / 255.0
a = cv2.dilate(soft, np.ones((25, 25), np.uint8)).astype(np.float32)[..., None] / 255.0
back = img * (1 - a) + filled * a

out = "public/media/cabin"
os.makedirs(out, exist_ok=True)
cv2.imwrite(f"{out}/back.jpg", (back * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
fg = np.dstack([(img * 255).astype(np.uint8), soft])
cv2.imwrite(f"{out}/fg.webp", fg, [cv2.IMWRITE_WEBP_QUALITY, 88])

print("wrote", out, W, H)
