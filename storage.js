const fs = require('fs');
const path = require('path');

// 导入服务器模块以使用broadcast函数
let broadcast;
try {
    const serverModule = require('./server');
    broadcast = serverModule.broadcast;
} catch (error) {
    // 服务器模块尚未初始化，稍后会设置
    broadcast = null;
}

// 允许外部设置broadcast函数
function setBroadcast(broadcastFn) {
    broadcast = broadcastFn;
}

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
    
    // 广播照片上传消息
    if (broadcast) {
        try {
            broadcast({ type: 'photo_uploaded', photo: newPhoto });
        } catch (error) {
            console.error('广播照片上传消息失败:', error);
        }
    }
    
    return newPhoto;
}

// 删除照片
function deletePhoto(id) {
    const photos = readPhotos();
    const photoIndex = photos.findIndex(p => p.id === id);
    
    if (photoIndex === -1) {
        return false;
    }
    
    // 从数组中删除
    photos.splice(photoIndex, 1);
    writePhotos(photos);
    
    // 注意：不再删除文件，因为同一个文件可能被多个用户引用
    // 这样当一个用户删除照片时，不会影响其他用户的照片
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

// 更新照片导出状态
function updatePhotoExportStatus(id, exported) {
    const photos = readPhotos();
    const photoIndex = photos.findIndex(p => p.id === id);
    
    if (photoIndex === -1) {
        return false;
    }
    
    photos[photoIndex].exported = exported;
    return writePhotos(photos);
}

// 获取未导出的照片数量
function getUnexportedPhotosCount() {
    const photos = readPhotos();
    return photos.filter(photo => photo.exported !== true).length;
}

// 更新照片信息
function updatePhoto(id, updates) {
    try {
        console.log('开始更新照片:', id, updates);
        const photos = readPhotos();
        console.log('读取到照片数量:', photos.length);
        
        const photoIndex = photos.findIndex(p => p.id === id);
        console.log('找到照片索引:', photoIndex);
        
        if (photoIndex === -1) {
            console.log('照片不存在:', id);
            return false;
        }
        
        console.log('更新前的照片信息:', photos[photoIndex]);
        photos[photoIndex] = { ...photos[photoIndex], ...updates };
        console.log('更新后的照片信息:', photos[photoIndex]);
        
        const result = writePhotos(photos);
        console.log('写入结果:', result);
        return result;
    } catch (error) {
        console.error('更新照片失败:', error);
        return false;
    }
}

module.exports = {
    storageConfig,
    ensureDirectories,
    addPhoto,
    deletePhoto,
    getAllPhotos,
    getPhotoById,
    updatePhotoExportStatus,
    updatePhoto,
    getUnexportedPhotosCount,
    setBroadcast
};