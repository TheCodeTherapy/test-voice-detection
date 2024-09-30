import "./style.css";
import { Detect, utils } from "web-voice-detection";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Web Voice Detection Test</h1>
    <div>
      <button id="startButton">Start Listening</button>
      <button id="stopButton" disabled>Stop Listening</button>
    </div>
    <div id="status" class="status">Press Start to begin</div>
    <ul id="audio-list"></ul>
    <canvas id="audio-visualizer"></canvas>
  </div>
`;

const startButton = document.getElementById("startButton") as HTMLButtonElement;
const stopButton = document.getElementById("stopButton") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const audioList = document.getElementById("audio-list") as HTMLUListElement;
const audioVisualizer = document.getElementById(
  "audio-visualizer"
) as HTMLCanvasElement;

let detection: Detect;
let audioElements: HTMLLIElement[] = [];
let audioCount = 0;

function drawVisualizer(
  fftData: Float32Array,
  width: number,
  height: number,
  ctx: CanvasRenderingContext2D
) {
  const barWidth = Math.max(2, Math.floor(width / fftData.length));
  ctx.clearRect(0, 0, width, height);
  for (let i = 0; i < fftData.length; i++) {
    const barHeight = Math.max(3, (fftData[i] + 130) * 2);
    const x = i * barWidth;
    const y = height - barHeight;
    const hue = Math.round((i * 360) / fftData.length);
    const lightness = Math.max(33, Math.floor((barHeight / 227) * 100));
    ctx.fillStyle = `hsl(${hue}, 50%, ${lightness}%)`;
    ctx.fillRect(x, y, barWidth - 1, barHeight);
  }
}

async function startListening() {
  try {
    detection = await Detect.new({
      onSpeechStart: () => {
        statusDiv.textContent = "Speech detected!";
      },
      onSpeechEnd: (arr: Float32Array) => {
        statusDiv.textContent = "Speech ended.";
        const wavBuffer = utils.encodeWAV(arr);
        const base64 = utils.arrayBufferToBase64(wavBuffer);
        const url = `data:audio/wav;base64,${base64}`;
        const li = document.createElement("li");
        li.className = "audio-item";
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = url;
        li.appendChild(audio);
        const label = document.createElement("span");
        label.className = "audio-label";
        label.textContent = ` Audio ${++audioCount}`;
        li.appendChild(label);
        audioList.prepend(li);
        audio.play();

        audioElements.unshift(li);
        if (audioElements.length > 5) {
          const lastEl = audioElements.pop()!;
          lastEl.remove();
        }
      },
      onMisfire: () => {
        statusDiv.textContent = "Misfire!";
      },
      onFFTProcessed: (fftData) => {
        const ctx = audioVisualizer.getContext("2d")!;
        drawVisualizer(
          fftData,
          audioVisualizer.width,
          audioVisualizer.height,
          ctx
        );
      },
    });

    detection.start();
    startButton.disabled = true;
    stopButton.disabled = false;
    statusDiv.textContent = "Listening...";
  } catch (error) {
    console.error("Error initializing MicVAD:", error);
    statusDiv.textContent = "Error: Could not access microphone.";
  }
}

function stopListening() {
  if (detection) {
    detection.destroy();
    startButton.disabled = false;
    stopButton.disabled = true;
    statusDiv.textContent = "Press Start to begin";
  }
}

startButton.addEventListener("click", startListening);
stopButton.addEventListener("click", stopListening);

startListening();
