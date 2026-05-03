let stream = null;
let capturedImage = null;
let currentNumber = 1;
let productCode = '';
let suffix = '';
let username = null;
let currentShareCode = null;
let isUploading = false;

// 从localStorage加载参数
function loadParams() {
    productCode = localStorage.getItem('productCode') || '';
    suffix = localStorage.getItem('suffix') || '';
    currentNumber = parseInt(localStorage.getItem('currentNumber')) || 1;
    
    // 加载用户名和共享码
    try {
        username = localStorage.getItem('username') || 'unknown';
        currentShareCode = localStorage.getItem('currentShareCode');
    } catch (error) {
        console.error('localStorage访问被阻止:', error);
        username = 'unknown';
    }
    
    // 验证参数
    if (!productCode || !suffix) {
        // 如果没有参数，跳转到选项页面
        window.location.href = 'index.html';
    }
}

// DOM元素
const cameraPreview = document.getElementById('cameraPreview');
const imagePreview = document.getElementById('imagePreview');
const capturedImageEl = document.getElementById('capturedImage');
const capturePhotoBtn = document.getElementById('capturePhoto');
const retakePhotoBtn = document.getElementById('retakePhoto');
const uploadPhotoBtn = document.getElementById('uploadPhoto');
const backToCameraBtn = document.getElementById('backToCamera');
const cameraSection = document.querySelector('.camera-section');
const previewSection = document.querySelector('.preview-section');
const photoGallery = document.getElementById('photoGallery');

// 初始化事件监听器
function initEventListeners() {
    uploadPhotoBtn.addEventListener('click', uploadPhoto);
    backToCameraBtn.addEventListener('click', backToCamera);
    
    // 系统相机功能
    const systemCameraInput = document.getElementById('systemCameraInput');
    
    if (systemCameraInput) {
        systemCameraInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleSystemCameraPhoto(file);
            }
        });
    }
}

function handleSystemCameraPhoto(file) {
    let assignedNumber;
    let filename;
    if (suffix) {
        assignedNumber = currentNumber;
        filename = `${productCode}${suffix.replace(/\d+$/, '')}${assignedNumber}.jpg`;
        currentNumber++;
        localStorage.setItem('currentNumber', currentNumber.toString());
    } else {
        filename = `${productCode}.jpg`;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        capturedImage = e.target.result;
        capturedImageEl.src = capturedImage;

        cameraSection.style.display = 'none';
        previewSection.style.display = 'block';

        uploadPhoto(filename);
    };
    reader.readAsDataURL(file);
}





// 拍照
function capturePhoto() {
    const ctx = imagePreview.getContext('2d');
    imagePreview.width = cameraPreview.videoWidth;
    imagePreview.height = cameraPreview.videoHeight;
    ctx.drawImage(cameraPreview, 0, 0, imagePreview.width, imagePreview.height);
    
    capturedImage = imagePreview.toDataURL('image/jpeg');
    capturedImageEl.src = capturedImage;
    
    // 显示预览区域
    cameraSection.style.display = 'none';
    previewSection.style.display = 'block';
    uploadPhotoBtn.disabled = false;
}

// 重拍
function retakePhoto() {
    if (stream) {
        cameraSection.style.display = 'block';
        previewSection.style.display = 'none';
        capturedImage = null;
        capturedImageEl.src = '';
    }
}

// 返回相机
function backToCamera() {
    retakePhoto();
}

async function uploadPhoto(filename) {
    if (!capturedImage) return;
    if (isUploading) {
        console.log('正在上传中，请等待');
        return;
    }

    isUploading = true;

    try {
        const response = await fetch(capturedImage);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('photo', blob, filename || `${productCode}.jpg`);
        formData.append('productCode', productCode);
        formData.append('username', username || 'unknown');
        if (currentShareCode) {
            formData.append('shareCode', currentShareCode);
        }

        const res = await fetch('http://192.168.40.252:3001/api/photos', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            throw new Error('上传失败');
        }

        const result = await res.json();
        console.log('上传成功:', result);

        alert(`照片 ${filename} 上传成功！`);

        loadAlbum();

        backToCamera();
    } catch (error) {
        console.error('上传失败:', error);
        alert('上传失败，请重试');
    } finally {
        isUploading = false;
    }
}

// 加载相册
async function loadAlbum() {
    try {
        // 从后端API获取照片
        const res = await fetch('/api/photos');
        
        if (!res.ok) {
            throw new Error('加载相册失败');
        }
        
        const photos = await res.json();
        
        // 清空相册
        photoGallery.innerHTML = '';
        
        // 添加照片到相册
        photos.forEach(photo => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';
            photoItem.innerHTML = `
                <img src="${photo.path}" alt="照片">
                <div class="photo-info">
                    ${new Date(photo.timestamp).toLocaleString()}
                </div>
            `;
            photoGallery.appendChild(photoItem);
        });
    } catch (error) {
        console.error('加载相册失败:', error);
    }
}

// 初始化应用
function initApp() {
    // 加载参数
    loadParams();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 自动打开相机
    setTimeout(() => {
        const systemCameraInput = document.getElementById('systemCameraInput');
        if (systemCameraInput) {
            systemCameraInput.click();
        }
    }, 500);
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', initApp);