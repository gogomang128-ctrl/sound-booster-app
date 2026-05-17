// js/app.js - النسخة الآمنة (Safe Mode)

// تهيئة المتغيرات
let audioContext = null;
let audioSource = null;
let audioBuffer = null;
let gainNode = null;
let analyser = null;
let convolverNode = null;
let stereoNode = null;
let eqFilters = {};
let objectUrl = null;
let animationId = null;
const audio = new Audio();
audio.crossOrigin = 'anonymous';

// حالة التطبيق
let state = {
    audioFile: null,
    isPlaying: false,
    duration: 0,
    volume: 100,
    eqEnabled: false,
    effects: { noise: false, enhance: false, reverb: false, stereo: false }
};

const eqPresets = { flat: [0,0,0,0,0], bass: [8,5,0,0,0] };

// تعريف العناصر (باستخدام دالة مساعدة للبحث)
function getElement(id) { return document.getElementById(id); }

const elements = {
    uploadBox: getElement('uploadBox'),
    audioInput: getElement('audioInput'),
    fileInfo: getElement('fileInfo'),
    fileName: getElement('fileName'),
    fileSize: getElement('fileSize'),
    removeFile: getElement('removeFile'),
    playerSection: getElement('playerSection'),
    waveform: getElement('waveform'),
    playbackProgress: getElement('playbackProgress'),
    playBtn: getElement('playBtn'),
    playIcon: getElement('playIcon'),
    rewindBtn: getElement('rewindBtn'),
    forwardBtn: getElement('forwardBtn'),
    seekBar: getElement('seekBar'),
    currentTime: getElement('currentTime'),
    durationLabel: getElement('duration'), // غيرت الاسم عشان يكون دقيق
    boostSection: getElement('boostSection'),
    volumeSlider: getElement('volumeSlider'),
    volumeValue: getElement('volumeValue'),
    boostBtns: document.querySelectorAll('.boost-btn'),
    exportSection: getElement('exportSection'),
    exportBtn: getElement('exportBtn'),
    exportProgress: getElement('exportProgress'),
    progressFill: getElement('progressFill'),
    progressText: getElement('progressText'),
    toastContainer: getElement('toastContainer')
};

// التأكد من وجود العناصر الأساسية قبل البدء
function init() {
    if (!elements.audioInput || !elements.playBtn) {
        console.error("⛔ بعض عناصر الصفحة مفقودة! تأكد من أن أسماء الـ IDs دقيقة.");
        showToast('خطأ في تحميل الواجهة', 'error');
        return;
    }

    setupEventListeners();
    drawIdleWaveform();
}

// ربط الأحداث (آمن)
function setupEventListeners() {
    if(elements.uploadBox) elements.uploadBox.addEventListener('dragover', e => e.preventDefault());
    if(elements.uploadBox) elements.uploadBox.addEventListener('drop', handleDrop);
    
    const handleFileSelect = () => {
        const file = elements.audioInput.files[0];
        if(file) loadAudioFile(file);
    };
    
    elements.audioInput?.addEventListener('change', handleFileSelect);
    elements.removeFile?.addEventListener('click', removeCurrentFile);
    elements.playBtn?.addEventListener('click', togglePlay);
    elements.rewindBtn?.addEventListener('click', () => seekBy(-10));
    elements.forwardBtn?.addEventListener('click', () => seekBy(10));
    elements.seekBar?.addEventListener('input', handleSeek);
    elements.volumeSlider?.addEventListener('input', e => setVolume(parseInt(e.target.value)));
    elements.boostBtns.forEach(btn => btn?.addEventListener('click', () => setVolume(parseInt(btn.dataset.boost))));
    elements.exportBtn?.addEventListener('click', exportAudio);

    audio.onloadedmetadata = handleMetadataLoaded;
    audio.onended = handleEnded;
    audio.onpause = () => { state.isPlaying = false; updatePlayButton(); };
    audio.onplay = () => { state.isPlaying = true; updatePlayButton(); };
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadBox.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) loadAudioFile(file);
}

async function loadAudioFile(file) {
    try {
        showToast('جاري المعالجة...', 'warning');
        
        // إيقاف أي صوت سابق
        audio.pause();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(file);
        
        audio.src = objectUrl;
        await audio.load();

        state.audioFile = file;
        
        // تحديث واجهة المستخدم
        elements.fileName.textContent = file.name;
        elements.fileSize.textContent = formatFileSize(file.size);
        elements.fileInfo.style.display = 'flex';
        elements.uploadBox.style.display = 'none';
        elements.playerSection.style.display = 'block';
        elements.boostSection.style.display = 'block';
        elements.exportSection.style.display = 'block';

        showToast('تم تحميل الملف بنجاح ✅', 'success');
    } catch (err) {
        console.error(err);
        showToast('تعذر تحميل الملف ❌', 'error');
    }
}

// ... باقي الدوال تحذفها وتستبدلها بنفس النسخة القديمة لكن مع التعديلات التالية:
// تأكد من استخدام `getElement` عند طلب العناصر الجديدة وتغيير `getElementById('duration')` إلى `elements.durationLabel`
// استخدم `safeDisconnect` و `connectAudioNodes` كالمعتاد

function removeCurrentFile() {
    audio.removeAttribute('src');
    audio.load();
    elements.fileInfo.style.display = 'none';
    elements.uploadBox.style.display = 'block';
    elements.playerSection.style.display = 'none';
    elements.boostSection.style.display = 'none';
    elements.exportSection.style.display = 'none';
}

function togglePlay() {
    if(!audio.src) {
        showToast('اختر ملف أولاً 📂', 'warning');
        return;
    }
    if(audio.paused) {
        audio.play().catch(e => {
            console.error(e);
            showToast('خطأ في التشغيل', 'error');
        });
        animateWaveform();
    } else {
        audio.pause();
    }
    updatePlayButton();
}

function handleSeek(e) {
    audio.currentTime = (e.target.value / 100) * audio.duration;
}

function updateProgress() {
    elements.currentTime.textContent = formatTime(audio.currentTime);
    elements.seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
    elements.playbackProgress.style.width = `${elements.seekBar.value}%`;
}

function handleMetadataLoaded() {
    elements.durationLabel.textContent = formatTime(audio.duration);
    state.duration = audio.duration;
}

function handleEnded() {
    state.isPlaying = false;
    updatePlayButton();
    cancelAnimationFrame(animationId);
}

function setVolume(v) {
    state.volume = v;
    if(gainNode) gainNode.gain.value = v/100;
    elements.volumeValue.textContent = v;
    elements.volumeSlider.value = v;
}

// ... إضافة باقي الوظائف (EQ, Export, Waveform...) بنفس الطريقة الآمنة