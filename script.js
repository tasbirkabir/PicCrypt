// ---------- GLOBAL STATE ----------
let imageQueue = []; // stores { id, file, originalFile, originalUrl, originalSize, compressedBlob, compressedSize, status, originalFormat }
let nextId = 1;
let beepEnabled = false;
let audioCtx = null;
let totalOriginalBytes = 0;
let totalCompressedBytes = 0;

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchUrlBtn');
const qualitySlider = document.getElementById('qualitySlider');
const qualityVal = document.getElementById('qualityVal');
const formatSelect = document.getElementById('formatSelect');
const scaleSelect = document.getElementById('scaleSelect');
const prefixInput = document.getElementById('prefixInput');
const stripMetadata = document.getElementById('stripMetadataToggle');
const watermarkText = document.getElementById('watermarkText');
const audioToggle = document.getElementById('audioToggleBtn');
const beepStatusSpan = document.getElementById('beepStatus');
const executeBtn = document.getElementById('executeCompressBtn');
const zipBtn = document.getElementById('downloadAllZipBtn');
const clearBtn = document.getElementById('clearTerminalBtn');
const imageGrid = document.getElementById('imageGrid');
const fileCounterSpan = document.getElementById('fileCounter');
const spaceSavedSpan = document.getElementById('spaceSaved');

// modal elements
const modal = document.getElementById('modalOverlay');
const modalOriginal = document.getElementById('modalOriginalImg');
const modalCompressed = document.getElementById('modalCompressedImg');
const sliderHandle = document.getElementById('sliderHandle');
const closeModal = document.getElementById('closeModalBtn');

// Helper: update stats display
function updateStats() {
    fileCounterSpan.innerText = `TOTAL FILES INJECTED: ${imageQueue.length}`;
    let savedMB = (totalOriginalBytes - totalCompressedBytes) / (1024 * 1024);
    let percent = totalOriginalBytes ? ((totalOriginalBytes - totalCompressedBytes) / totalOriginalBytes * 100).toFixed(1) : 0;
    spaceSavedSpan.innerText = `TERMINAL SPACE SAVED: ${savedMB > 0 ? savedMB.toFixed(2) : 0} MB (${percent}%)`;
}

// Render cards from imageQueue (with dynamic logs)
function renderQueue() {
    if (imageQueue.length === 0) {
        imageGrid.innerHTML = `<div class="text-center text-zinc-600 text-sm p-10 col-span-full">// NO IMAGES IN TERMINAL BUFFER //</div>`;
        updateStats();
        return;
    }
    let html = '';
    imageQueue.forEach(item => {
        let statusText = item.compressedBlob ? 'SUCCESS' : (item.status === 'processing' ? 'PROCESSING...' : 'READY');
        let sizeInfo = item.originalSize ? `${(item.originalSize/1024).toFixed(1)}KB` : '--';
        let compSizeInfo = item.compressedSize ? `${(item.compressedSize/1024).toFixed(1)}KB` : 'pending';
        html += `
            <div class="card-item border border-zinc-800 bg-zinc-900/40 rounded-md p-2 flex flex-col gap-2" data-id="${item.id}">
                <div class="w-full h-28 bg-black/60 rounded-sm overflow-hidden flex justify-center items-center">
                    <img src="${item.originalUrl}" class="max-w-full max-h-full object-contain" alt="thumb">
                </div>
                <div class="text-[10px] font-mono truncate">${item.file.name}</div>
                <div class="flex justify-between text-[9px] text-zinc-400"><span>RAW: ${sizeInfo}</span><span>COMP: ${compSizeInfo}</span></div>
                <div class="text-[9px] text-[#00cc44]">${statusText}</div>
                <div class="flex gap-2 mt-1">
                    ${item.compressedBlob ? `<button class="downloadSingleBtn text-[10px] terminal-btn px-2 py-0.5 rounded-sm bg-black/60" data-id="${item.id}">⬇ SINGLE</button>` : `<button disabled class="text-[10px] text-zinc-600 px-2 py-0.5">NO DATA</button>`}
                    ${item.compressedBlob ? `<button class="compareBtn text-[10px] terminal-btn px-2 py-0.5 rounded-sm bg-black/60" data-id="${item.id}">🔍 COMPARE</button>` : ''}
                </div>
            </div>
        `;
    });
    imageGrid.innerHTML = html;
    
    // attach single download and compare listeners
    document.querySelectorAll('.downloadSingleBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            const item = imageQueue.find(i => i.id === id);
            if (item && item.compressedBlob) downloadBlob(item.compressedBlob, getFinalName(item));
        });
    });
    document.querySelectorAll('.compareBtn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            const item = imageQueue.find(i => i.id === id);
            if (item && item.originalUrl && item.compressedBlob) openCompareModal(item);
        });
    });
    updateStats();
}

function getFinalName(item) {
    let prefix = prefixInput.value.trim() || "image";
    let ext = (formatSelect.value === 'webp') ? 'webp' : (item.originalFormat || 'png');
    if (formatSelect.value === 'original') ext = item.originalFormat || 'png';
    return `${prefix}-${item.id}.${ext}`;
}

function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// core compression function for an image item
async function compressImage(item) {
    item.status = 'processing';
    renderQueue();
    const quality = parseInt(qualitySlider.value) / 100;
    const scaleFactor = parseFloat(scaleSelect.value);
    const targetFormat = formatSelect.value === 'webp' ? 'image/webp' : (item.originalFormat === 'jpeg' ? 'image/jpeg' : 'image/png');
    const mimeType = targetFormat;
    const strip = stripMetadata.checked;
    const watermark = watermarkText.value.trim();

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width * scaleFactor;
            let height = img.height * scaleFactor;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // strip metadata: drawing onto canvas removes EXIF automatically
            if (watermark) {
                ctx.font = `${Math.max(12, width * 0.03)}px monospace`;
                ctx.fillStyle = '#00cc4488';
                ctx.shadowBlur = 0;
                ctx.fillText(watermark, width - (width * 0.15), height - 12);
            }
            canvas.toBlob(async (blob) => {
                if (!blob) return resolve(null);
                item.compressedBlob = blob;
                item.compressedSize = blob.size;
                totalCompressedBytes = imageQueue.reduce((sum, i) => sum + (i.compressedSize || 0), 0);
                totalOriginalBytes = imageQueue.reduce((sum, i) => sum + (i.originalSize || 0), 0);
                item.status = 'done';
                if (beepEnabled) playBeep();
                renderQueue();
                resolve(blob);
            }, mimeType, quality);
        };
        img.onerror = () => resolve(null);
        img.src = item.originalUrl;
    });
}

async function processAllCompressions() {
    for (let item of imageQueue) {
        if (!item.compressedBlob) await compressImage(item);
    }
    updateStats();
}

// add file to queue (supports File & URL)
function addFileToQueue(file, originalUrl = null) {
    if (imageQueue.length >= 20) { alert("MAX 20 FILES // TERMINAL LIMIT"); return; }
    if (!file.type.match('image.*')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const ext = file.type.split('/')[1];
        const newItem = {
            id: nextId++,
            file: file,
            originalFile: file,
            originalUrl: e.target.result,
            originalSize: file.size,
            compressedBlob: null,
            compressedSize: null,
            status: 'ready',
            originalFormat: ext === 'jpeg' ? 'jpg' : ext
        };
        imageQueue.push(newItem);
        totalOriginalBytes = imageQueue.reduce((sum, i) => sum + i.originalSize, 0);
        totalCompressedBytes = imageQueue.reduce((sum, i) => sum + (i.compressedSize || 0), 0);
        renderQueue();
    };
    reader.readAsDataURL(file);
}

// URL image fetch
async function fetchImageFromUrl(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) throw new Error();
        const fileName = url.split('/').pop().split('?')[0] || 'remote_image';
        const file = new File([blob], fileName, { type: blob.type });
        addFileToQueue(file);
    } catch(e) { alert("Failed to fetch image (CORS or invalid link)"); }
}

// drag & drop logic
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-[#00cc44]'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-[#00cc44]'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-[#00cc44]');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 20 - imageQueue.length);
    files.forEach(f => addFileToQueue(f));
});
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).slice(0, 20 - imageQueue.length);
    files.forEach(f => addFileToQueue(f));
    fileInput.value = '';
});
fetchBtn.addEventListener('click', () => { if(urlInput.value) fetchImageFromUrl(urlInput.value); });
qualitySlider.addEventListener('input', () => qualityVal.innerText = qualitySlider.value + '%');

audioToggle.addEventListener('click', () => {
    beepEnabled = !beepEnabled;
    if(beepEnabled && !audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    beepStatusSpan.innerText = beepEnabled ? "ACTIVE" : "MUTED";
    audioToggle.innerText = beepEnabled ? "🔊" : "🔇";
});
function playBeep() {
    if(!beepEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        osc.stop(audioCtx.currentTime + 0.2);
    } catch(e) {}
}

executeBtn.addEventListener('click', async () => {
    for(let item of imageQueue) if(!item.compressedBlob) await compressImage(item);
});
zipBtn.addEventListener('click', async () => {
    const zip = new JSZip();
    for(let item of imageQueue) {
        if(item.compressedBlob) {
            zip.file(getFinalName(item), item.compressedBlob);
        }
    }
    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "piccrypt_archive.zip");
});
clearBtn.addEventListener('click', () => {
    imageQueue.forEach(i => { if(i.originalUrl) URL.revokeObjectURL(i.originalUrl); });
    imageQueue = [];
    totalOriginalBytes = 0; totalCompressedBytes = 0;
    renderQueue();
});

// Before/After Slider Modal
let currentCompareItem = null;
function openCompareModal(item) {
    modalOriginal.src = item.originalUrl;
    const compUrl = URL.createObjectURL(item.compressedBlob);
    modalCompressed.src = compUrl;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    currentCompareItem = item;
    const handleMove = (clientX) => {
        const rect = document.getElementById('splitContainer').getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.min(Math.max(x, 20), rect.width - 20);
        const percent = (x / rect.width) * 100;
        sliderHandle.style.left = `${percent}%`;
        modalCompressed.style.clipPath = `polygon(${percent}% 0%, 100% 0%, 100% 100%, ${percent}% 100%)`;
    };
    const onMouseMove = (e) => handleMove(e.clientX);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX);
    const cleanUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('mouseup', cleanUp);
        window.removeEventListener('touchend', cleanUp);
    };
    sliderHandle.addEventListener('mousedown', () => { window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', cleanUp); });
    sliderHandle.addEventListener('touchstart', () => { window.addEventListener('touchmove', onTouchMove); window.addEventListener('touchend', cleanUp); });
    modalCompressed.style.clipPath = `polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)`;
    sliderHandle.style.left = `50%`;
}
closeModal.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    if(currentCompareItem && modalCompressed.src) URL.revokeObjectURL(modalCompressed.src);
});
window.addEventListener('click', (e) => { if(e.target === modal) closeModal.click(); });

// init
renderQueue();