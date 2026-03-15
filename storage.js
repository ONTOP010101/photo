const fs = require('fs');
const path = require('path');

// 存储配置
const storageConfig = {
    uploadDir: path.join(__dirname, 'uploads'),
    metadataFile: path.join(__dirname, 'data', 'photos.json')
};

// 确保目录存在
function ensureDirectories() {
    // 确保上传目录存在
    if (!fs.existsSync(storageConfig.uploadDir)) {
        fs.mkdirSync(storageConfig.uploadDir, { recursive: true });
    }
    
    // 确保数据目录存在
    const dataDir = path.dirname(storageConfig.metadataFile);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // 确保元数据文件存在
    if (!fs.existsSync(storageConfig.metadataFile)) {
        fs.writeFileSync(storageConfig.metadataFile, JSON.stringify([]));
    }
}

// 读取照片元数据
function readPhotos() {
    ensureDirectories();
    try {
        const data = fs.readFileSync(storageConfig.metadataFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取照片元数据失败:', error);
        return [];
    }
}

// 写入照片元数据
function writePhotos(photos) {
    ensureDirectories();
    try {
        fs.writeFileSync(storageConfig.metadataFile, JSON.stringify(photos, null, 2));
        return true;
    } catch (error) {
        console.error('写入照片元数据失败:', error);
        return false;
    }
}

// 添加照片
function addPhoto(photo) {
    const photos = readPhotos();
    const newPhoto = {
        ...photo,
        id: photos.length > 0 ? Math.max(...photos.map(p => p.id)) + 1 : 1
    };
    photos.push(newPhoto);
    writePhotos(photos);
    return newPhoto;
}

// 删除照片
function deletePhoto(id) {
    const photos = readPhotos();
    const photoIndex = photos.findIndex(p => p.id === id);
    
    if (photoIndex === -1) {
        return false;
    }
    
    // 删除文件
    const photo = photos[photoIndex];
    const filePath = path.join(storageConfig.uploadDir, photo.filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error('删除文件失败:', error);
        }
    }
    
    // 从数组中删除
    photos.splice(photoIndex, 1);
    writePhotos(photos);
    return true;
}

// 获取所有照片
function getAllPhotos() {
    return readPhotos();
}

// 根据ID获取照片
function getPhotoById(id) {
    const photos = readPhotos();
    return photos.find(p => p.id === id);
}

module.exports = {
    storageConfig,
    ensureDirectories,
    addPhoto,
    deletePhoto,
    getAllPhotos,
    getPhotoById
};