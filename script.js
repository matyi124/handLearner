let canvas, ctx, landmarks = null;
const samples = [];
const counts = {};

const labelInput = document.getElementById("label");
const countsDiv = document.getElementById("counts");

let recording = false;
let recordInterval, recordTimeout;

async function initMediapipe() {
  const hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7,
  });

  hands.onResults(onResults);

  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  await video.play();

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });
  camera.start();

  canvas = document.getElementById("webcam");
  canvas.width = 640;
  canvas.height = 480;
  ctx = canvas.getContext("2d");
}

function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    landmarks = results.multiHandLandmarks[0];
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
    drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1 });
  } else {
    landmarks = null;
  }

  ctx.restore();
}


function saveSample() {
  const label = labelInput.value.trim();
  if (!label) {
    alert("Írd be a gesztus nevét!");
    return;
  }
  if (!landmarks) {
    console.log("🚫 Nincs kéz a képen!");
    return;
  }

  const sample = [];
  for (const point of landmarks) {
    sample.push(Number(point.x.toFixed(4)));
    sample.push(Number(point.y.toFixed(4)));
  }
  sample.push(label);
  samples.push(sample);

  if (!counts[label]) counts[label] = 0;
  counts[label]++;
  updateCounts();
  console.log(`✅ Mentve: ${label}`);
}

function updateCounts() {
  countsDiv.innerHTML = Object.entries(counts)
    .map(([label, count]) => `${label}: ${count}`)
    .join(" | ");
}

function downloadCSV() {
  if (samples.length === 0) {
    alert("Nincs mentett minta!");
    return;
  }
  const csvContent =
    samples.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "hand_gestures.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function startRecording() {
  const label = labelInput.value.trim();
  if (!label) {
    alert("Írd be a gesztus nevét!");
    return;
  }
  if (recording) {
    alert("Már rögzítés folyamatban van!");
    return;
  }

  recording = true;
  let count = 0;
  console.log(`🚀 Rögzítés indul: ${label}`);

  recordInterval = setInterval(() => {
    saveSample();
    count++;
  }, 200); // 500ms-enként

  recordTimeout = setTimeout(() => {
    clearInterval(recordInterval);
    recording = false;
    console.log(`✅ Rögzítés vége: ${count} minta készült a(z) "${label}" gesztusról`);
    alert(`✅ Rögzítés vége: ${count} minta készült a(z) "${label}" gesztusról`);
  }, 60000); // 10s
}

document.getElementById("save").addEventListener("click", saveSample);
document.getElementById("download").addEventListener("click", downloadCSV);
document.getElementById("start-recording").addEventListener("click", startRecording);

initMediapipe();
