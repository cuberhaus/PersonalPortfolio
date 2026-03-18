// License plate detection pipeline ported from MATLAB (SPMatriculas)
// 3 stages: plate detection, character segmentation, OCR via template matching

export interface RegionProps {
  bbox: { x: number; y: number; w: number; h: number };
  area: number;
  solidity: number;
  extent: number;
  eccentricity: number;
  orientation: number;
  majorAxisLength: number;
  minorAxisLength: number;
}

export interface StageResult {
  canvas: HTMLCanvasElement;
  label: string;
}

export interface PipelineResult {
  plateText: string;
  stage1: StageResult[];
  stage2: StageResult[];
  stage3: StageResult[];
  charImages: HTMLCanvasElement[];
}

const CHAR_LABELS = [
  "1","2","3","4","5","6","7","8","9","0",
  "a","b","e","h","i","k","m","n","p","t","x","y","z",
];

function matToCanvas(cv: any, mat: any, label?: string): StageResult {
  const canvas = document.createElement("canvas");
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  let display = mat;
  if (mat.type() === cv.CV_8UC1) {
    display = new cv.Mat();
    cv.cvtColor(mat, display, cv.COLOR_GRAY2RGBA);
  } else if (mat.type() === cv.CV_8UC3) {
    display = new cv.Mat();
    cv.cvtColor(mat, display, cv.COLOR_BGR2RGBA);
  }
  cv.imshow(canvas, display);
  if (display !== mat) display.delete();
  return { canvas, label: label || "" };
}

function computeRegionProps(cv: any, contour: any, gray: any): RegionProps {
  const area = cv.contourArea(contour);
  const rect = cv.boundingRect(contour);
  const hull = new cv.Mat();
  cv.convexHull(contour, hull);
  const hullArea = cv.contourArea(hull);
  hull.delete();

  const moments = cv.moments(contour);
  const mu20 = moments.mu20 / moments.m00;
  const mu02 = moments.mu02 / moments.m00;
  const mu11 = moments.mu11 / moments.m00;

  const diff = mu20 - mu02;
  const sum = mu20 + mu02;
  const sqrtTerm = Math.sqrt(diff * diff + 4 * mu11 * mu11);
  const lambda1 = (sum + sqrtTerm) / 2;
  const lambda2 = (sum - sqrtTerm) / 2;

  const majorAxisLength = 4 * Math.sqrt(Math.max(lambda1, 0));
  const minorAxisLength = 4 * Math.sqrt(Math.max(lambda2, 0));
  const eccentricity =
    majorAxisLength > 0
      ? Math.sqrt(1 - (minorAxisLength * minorAxisLength) / (majorAxisLength * majorAxisLength))
      : 0;
  const orientation = (0.5 * Math.atan2(2 * mu11, diff) * 180) / Math.PI;
  const extent = rect.width * rect.height > 0 ? area / (rect.width * rect.height) : 0;
  const solidity = hullArea > 0 ? area / hullArea : 0;

  return {
    bbox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    area,
    solidity,
    extent,
    eccentricity,
    orientation,
    majorAxisLength,
    minorAxisLength,
  };
}

function filterPlateRegions(regions: RegionProps[], relaxExtent: boolean): RegionProps[] {
  return regions.filter((r) => {
    if (r.majorAxisLength >= 450) return false;
    if (r.minorAxisLength < 24) return false;
    if (r.eccentricity < 0.9) return false;
    if (!relaxExtent && (r.extent < 0.6 || r.extent > 1)) return false;
    if (r.orientation < -15 || r.orientation > 15) return false;
    if (r.solidity < 0.6) return false;
    return true;
  });
}

function clearBorder(cv: any, binary: any): any {
  const h = binary.rows;
  const w = binary.cols;
  const mask = cv.Mat.zeros(h + 2, w + 2, cv.CV_8UC1);
  const result = binary.clone();

  // Flood fill from all border pixels
  for (let x = 0; x < w; x++) {
    if (result.ucharAt(0, x) > 0) {
      cv.floodFill(result, mask, new cv.Point(x, 0), new cv.Scalar(0));
    }
    if (result.ucharAt(h - 1, x) > 0) {
      cv.floodFill(result, mask, new cv.Point(x, h - 1), new cv.Scalar(0));
    }
  }
  for (let y = 0; y < h; y++) {
    if (result.ucharAt(y, 0) > 0) {
      cv.floodFill(result, mask, new cv.Point(0, y), new cv.Scalar(0));
    }
    if (result.ucharAt(y, w - 1) > 0) {
      cv.floodFill(result, mask, new cv.Point(w - 1, y), new cv.Scalar(0));
    }
  }
  mask.delete();
  return result;
}

function fillHoles(cv: any, binary: any): any {
  const inv = new cv.Mat();
  cv.bitwise_not(binary, inv);
  const mask = cv.Mat.zeros(binary.rows + 2, binary.cols + 2, cv.CV_8UC1);
  cv.floodFill(inv, mask, new cv.Point(0, 0), new cv.Scalar(0));
  const result = new cv.Mat();
  cv.bitwise_or(binary, inv, result);
  inv.delete();
  mask.delete();
  return result;
}

function getRegions(cv: any, binary: any): RegionProps[] {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const regions: RegionProps[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    if (area < 10) { cnt.delete(); continue; }
    regions.push(computeRegionProps(cv, cnt, binary));
    cnt.delete();
  }
  contours.delete();
  hierarchy.delete();
  return regions;
}

function adaptiveThreshold(cv: any, gray: any, sensitivity: number): any {
  const result = new cv.Mat();
  let blockSize = Math.max(3, Math.floor(gray.cols / 8));
  if (blockSize % 2 === 0) blockSize += 1;
  // Higher sensitivity → lower effective threshold → more foreground pixels
  const C = Math.round((sensitivity * 2 - 1) * 15);
  cv.adaptiveThreshold(gray, result, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, blockSize, C);
  return result;
}

function findPlate(cv: any, src: any): { plate: any; stages: StageResult[] } | null {
  const stages: StageResult[] = [];
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  stages.push(matToCanvas(cv, gray, "Grayscale"));

  let sensitivity = 0.4;
  let bestRegion: RegionProps | null = null;

  while (sensitivity <= 1.0 && !bestRegion) {
    const binary = adaptiveThreshold(cv, gray, sensitivity);
    if (sensitivity <= 0.5) stages.push(matToCanvas(cv, binary, `Binarized (s=${sensitivity.toFixed(1)})`));

    const cleared = clearBorder(cv, binary);
    const filled = fillHoles(cv, cleared);
    cleared.delete();
    binary.delete();

    const regions = getRegions(cv, filled);
    const relaxExtent = sensitivity > 0.4;
    const filtered = filterPlateRegions(regions, relaxExtent);

    if (filtered.length > 0) {
      bestRegion = filtered.reduce((a, b) => (a.solidity > b.solidity ? a : b));
      // Draw detected region on a vis copy
      const vis = src.clone();
      const pt1 = new cv.Point(bestRegion.bbox.x, bestRegion.bbox.y);
      const pt2 = new cv.Point(
        bestRegion.bbox.x + bestRegion.bbox.w,
        bestRegion.bbox.y + bestRegion.bbox.h
      );
      cv.rectangle(vis, pt1, pt2, new cv.Scalar(0, 255, 0, 255), 3);
      stages.push(matToCanvas(cv, vis, "Plate detected"));
      vis.delete();
    }
    filled.delete();
    sensitivity += 0.1;
  }

  if (!bestRegion) {
    gray.delete();
    return null;
  }

  const { x, y, w, h } = bestRegion.bbox;
  const plate = src.roi(new cv.Rect(x, y, w, h));
  stages.push(matToCanvas(cv, plate, "Plate crop"));
  gray.delete();
  return { plate, stages };
}

function findChars(cv: any, plate: any): { chars: any[]; bboxes: RegionProps["bbox"][]; stages: StageResult[] } | null {
  const stages: StageResult[] = [];
  const gray = new cv.Mat();
  cv.cvtColor(plate, gray, cv.COLOR_RGBA2GRAY);

  const binary = adaptiveThreshold(cv, gray, 0.7);
  const inverted = new cv.Mat();
  cv.bitwise_not(binary, inverted);
  stages.push(matToCanvas(cv, inverted, "Inverted threshold"));
  binary.delete();

  const cleared = clearBorder(cv, inverted);
  inverted.delete();

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(cleared, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  const candidates: { bbox: RegionProps["bbox"]; props: RegionProps }[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const cnt = contours.get(i);
    const area = cv.contourArea(cnt);
    if (area < 30) { cnt.delete(); continue; }
    const props = computeRegionProps(cv, cnt, cleared);
    cnt.delete();

    if (props.majorAxisLength < 12 || props.majorAxisLength > 180) continue;
    if (props.area < 50) continue;
    if (props.extent < 0.25) continue;
    if (props.eccentricity > 0.99) continue;
    // Remove near-horizontal blobs (orientation close to 0 means horizontal major axis)
    if (Math.abs(props.orientation) < 60 && props.eccentricity > 0.9) continue;

    candidates.push({ bbox: props.bbox, props });
  }
  contours.delete();
  hierarchy.delete();
  cleared.delete();

  if (candidates.length === 0) {
    gray.delete();
    return null;
  }

  // Sort by x position (left to right)
  candidates.sort((a, b) => a.bbox.x - b.bbox.x);

  // Draw bounding boxes on plate vis
  const vis = plate.clone();
  for (const c of candidates) {
    cv.rectangle(
      vis,
      new cv.Point(c.bbox.x, c.bbox.y),
      new cv.Point(c.bbox.x + c.bbox.w, c.bbox.y + c.bbox.h),
      new cv.Scalar(0, 255, 0, 255),
      2
    );
  }
  stages.push(matToCanvas(cv, vis, `${candidates.length} characters found`));
  vis.delete();

  // Crop characters from original plate
  const chars: any[] = [];
  const bboxes: RegionProps["bbox"][] = [];
  for (const c of candidates) {
    const { x, y, w, h } = c.bbox;
    const cx = Math.max(0, x);
    const cy = Math.max(0, y);
    const cw = Math.min(w, plate.cols - cx);
    const ch = Math.min(h, plate.rows - cy);
    if (cw > 0 && ch > 0) {
      chars.push(plate.roi(new cv.Rect(cx, cy, cw, ch)));
      bboxes.push(c.bbox);
    }
  }

  gray.delete();
  return { chars, bboxes, stages };
}

function loadImageAsMat(cv: any, src: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const mat = cv.imread(canvas);
      resolve(mat);
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function prepareTemplates(cv: any, fontMat: any): { label: string; tmpl: any }[] {
  const gray = new cv.Mat();
  if (fontMat.channels() > 1) {
    cv.cvtColor(fontMat, gray, cv.COLOR_RGBA2GRAY);
  } else {
    fontMat.copyTo(gray);
  }

  // Crop: [15, 0, 500, 70] — x=15, y=0, w=500, h=70
  const cropH = Math.min(70, gray.rows);
  const cropped = gray.roi(new cv.Rect(15, 0, Math.min(500, gray.cols - 15), cropH));

  // Erase dash region (x 205-225 relative to cropped)
  const dashStart = 205 - 15;
  const dashEnd = 225 - 15;
  for (let y = 0; y < cropped.rows; y++) {
    for (let x = dashStart; x <= Math.min(dashEnd, cropped.cols - 1); x++) {
      cropped.ucharPtr(y, x)[0] = 255;
    }
  }

  // Binarize
  const bin = new cv.Mat();
  cv.threshold(cropped, bin, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

  // Find connected components
  const contours = new cv.MatVector();
  const hier = new cv.Mat();
  cv.findContours(bin, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  // Get bounding boxes sorted by x
  const boxes: { x: number; y: number; w: number; h: number; idx: number }[] = [];
  for (let i = 0; i < contours.size(); i++) {
    const r = cv.boundingRect(contours.get(i));
    boxes.push({ x: r.x, y: r.y, w: r.width, h: r.height, idx: i });
  }
  boxes.sort((a, b) => a.x - b.x);

  const templates: { label: string; tmpl: any }[] = [];
  const numExpected = CHAR_LABELS.length;

  // Take the first numExpected connected components
  for (let i = 0; i < Math.min(boxes.length, numExpected); i++) {
    const b = boxes[i];
    const charRoi = bin.roi(new cv.Rect(b.x, b.y, b.w, b.h));
    const resized = new cv.Mat();
    cv.resize(charRoi, resized, new cv.Size(20, 30));
    templates.push({ label: CHAR_LABELS[i], tmpl: resized });
    charRoi.delete();
  }

  for (let i = 0; i < contours.size(); i++) contours.get(i).delete();
  contours.delete();
  hier.delete();
  bin.delete();
  cropped.delete();
  gray.delete();

  return templates;
}

function identifyChars(
  cv: any,
  charMats: any[],
  templates: { label: string; tmpl: any }[]
): { text: string; stages: StageResult[]; charCanvases: HTMLCanvasElement[] } {
  const stages: StageResult[] = [];
  const charCanvases: HTMLCanvasElement[] = [];
  let text = "";

  for (const charMat of charMats) {
    const gray = new cv.Mat();
    if (charMat.channels() > 1) {
      cv.cvtColor(charMat, gray, cv.COLOR_RGBA2GRAY);
    } else {
      charMat.copyTo(gray);
    }

    const bin = new cv.Mat();
    cv.threshold(gray, bin, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

    const resized = new cv.Mat();
    cv.resize(bin, resized, new cv.Size(20, 30));

    charCanvases.push(matToCanvas(cv, resized, "").canvas);

    let bestScore = -Infinity;
    let bestLabel = "?";

    for (const t of templates) {
      const result = new cv.Mat();
      cv.matchTemplate(resized, t.tmpl, result, cv.TM_CCOEFF_NORMED);
      const score = result.floatAt(0, 0);
      if (score > bestScore) {
        bestScore = score;
        bestLabel = t.label;
      }
      result.delete();
    }

    text += bestLabel;
    gray.delete();
    bin.delete();
    resized.delete();
  }

  return { text, stages, charCanvases };
}

export async function runPipeline(
  cv: any,
  imageSrc: string,
  fontSrc: string
): Promise<PipelineResult> {
  const [src, fontMat] = await Promise.all([
    loadImageAsMat(cv, imageSrc),
    loadImageAsMat(cv, fontSrc),
  ]);

  const templates = prepareTemplates(cv, fontMat);
  fontMat.delete();

  // Stage 1: Plate detection
  const plateResult = findPlate(cv, src);
  if (!plateResult) {
    const fallback = matToCanvas(cv, src, "Original — no plate detected");
    src.delete();
    templates.forEach((t) => t.tmpl.delete());
    return {
      plateText: "(no plate found)",
      stage1: [fallback],
      stage2: [],
      stage3: [],
      charImages: [],
    };
  }

  // Stage 2: Character segmentation
  const charResult = findChars(cv, plateResult.plate);
  if (!charResult || charResult.chars.length === 0) {
    const fallback = matToCanvas(cv, plateResult.plate, "Plate — no characters detected");
    plateResult.plate.delete();
    src.delete();
    templates.forEach((t) => t.tmpl.delete());
    return {
      plateText: "(no characters found)",
      stage1: plateResult.stages,
      stage2: [fallback],
      stage3: [],
      charImages: [],
    };
  }

  // Stage 3: OCR
  const ocrResult = identifyChars(cv, charResult.chars, templates);

  // Cleanup
  charResult.chars.forEach((c: any) => c.delete());
  plateResult.plate.delete();
  src.delete();
  templates.forEach((t) => t.tmpl.delete());

  return {
    plateText: ocrResult.text,
    stage1: plateResult.stages,
    stage2: charResult.stages,
    stage3: ocrResult.stages,
    charImages: ocrResult.charCanvases,
  };
}
