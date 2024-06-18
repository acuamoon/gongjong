const video = document.getElementById("video");
const frontCameraButton = document.getElementById("frontCamera");
const backCameraButton = document.getElementById("backCamera");
const MODEL_URL = "https://acuamoon.github.io/gongjong/face_models/";

let currentStream;

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
]).then(startVideo);


function startVideo() {
  selectCamera("user"); // 기본적으로 전면 카메라 사용
}

function selectCamera(facingMode) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: facingMode,
      },
      audio: false,
    })
    .then((stream) => {
      currentStream = stream;
      video.srcObject = stream;
    })
    .catch((error) => {
      console.error(error);
    });
}

video.addEventListener("play", () => {
  const canvas = document.getElementById('canvas');
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  canvas.width = displaySize.width;
  canvas.height = displaySize.height;
  
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    resizedDetections.forEach((detection) => {
      const { age, gender, expressions, detection: { box } } = detection;
      
      // 감정 상태를 한글로 변환
      const emotions = Object.entries(expressions)
        .sort((a, b) => b[1] - a[1])
        .map(([emotion, score]) => {
          switch (emotion) {
            case 'neutral': return '[평온]';
            case 'happy': return '[행복]';
            case 'sad': return '[슬픔]';
            case 'angry': return '[분노]';
            case 'fearful': return '[공포]';
            case 'disgusted': return '[혐오]';
            case 'surprised': return '[놀람]';
            default: return '';
          }
        });

      const emotionText = emotions[0]; // 가장 높은 감정 상태

      const drawBox = new faceapi.draw.DrawBox(box, {
        label: `${Math.round(age)}세 ${gender === 'male' ? '남자 ' : '여자 '} ${emotionText}`,
        fontSize: 30 // label 사이즈 크게
      });
      drawBox.draw(canvas);
    });

    console.log(detections);
  }, 100);
});

