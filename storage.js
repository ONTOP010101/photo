const fs = require('fs');
const path = require('path');

let broadcast;
try {
    const serverModule = require('./server');
    broadcast = serverModule.broadcast;
} catch (error) {
    broadcast = null;
}

function setBroadcast(broadcastFn) {
    broadcast = broadcastFn;
}

const storageConfig = {
    uploadDir: path.join(__dirname, 'uploads'),
    metadataFile: path.join(__dirname, 'data', 'photos.json')
};

let writeLock = Promise.resolve();

function ensureDirectories() {
    if (!fs.existsSync(storageConfig.uploadDir)) {
        fs.mkdirSync(storageConfig.uploadDir, { recursive: true });
    }
    const dataDir = path.dirname(storageConfig.metadataFile);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(storageConfig.metadataFile)) {
        fs.writeFileSync(storageConfig.metadataFile, JSON.stringify([]));
    }
}

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

function addPhoto(photo) {
    return new Promise((resolve) => {
        writeLock = writeLock.then(() => {
            try {
                const photos = readPhotos();
                const newPhoto = {
                    ...photo,
                    id: photos.length > 0 ? Math.max(...photos.map(p => p.id)) + 1 : 1
                };
                photos.push(newPhoto);
                writePhotos(photos);

                if (broadcast) {
                    try {
                        broadcast({ type: 'photo_uploaded', photo: newPhoto });
                    } catch (error) {
                        console.error('广播照片上传消息失败:', error);
                    }
                }

                resolve(newPhoto);
            } catch (error) {
                console.error('添加照片失败:', error);
                resolve(null);
            }
        });
    });
}

function addPhotosBatch(photoList) {
    return new Promise((resolve) => {
        writeLock = writeLock.then(() => {
            try {
                const photos = readPhotos();
                const newPhotos = photoList.map(photo => {
                    const newPhoto = {
                        ...photo,
                        id: photos.length > 0 ? Math.max(...photos.map(p => p.id)) + 1 : 1
                    };
                    photos.push(newPhoto);
                    return newPhoto;
                });
                writePhotos(photos);

                if (broadcast) {
                    newPhotos.forEach(newPhoto => {
                        try {
                            broadcast({ type: 'photo_uploaded', photo: newPhoto });
                        } catch (error) {
                            console.error('广播照片上传消息失败:', error);
                        }
                    });
                }

                resolve(newPhotos);
            } catch (error) {
                console.error('批量添加照片失败:', error);
                resolve([]);
            }
        });
    });
}

function deletePhoto(id) {
    return new Promise((resolve) => {
        writeLock = writeLock.then(() => {
            try {
                const photos = readPhotos();
                const photoIndex = photos.findIndex(p => p.id === id);
                if (photoIndex === -1) {
                    resolve(false);
                    return;
                }
                photos.splice(photoIndex, 1);
                writePhotos(photos);
                resolve(true);
            } catch (error) {
                console.error('删除照片失败:', error);
                resolve(false);
            }
        });
    });
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

function updatePhotoExportStatus(id, exported) {
    return new Promise((resolve) => {
        writeLock = writeLock.then(() => {
            try {
                const photos = readPhotos();
                const photoIndex = photos.findIndex(p => p.id === id);
                if (photoIndex === -1) {
                    resolve(false);
                    return;
                }
                photos[photoIndex].exported = exported;
                resolve(writePhotos(photos));
            } catch (error) {
                console.error('更新导出状态失败:', error);
                resolve(false);
            }
        });
    });
}

// 获取未导出的照片数量
function getUnexportedPhotosCount(username) {
    const photos = readPhotos();
    if (username) {
        // 只返回指定用户的未导出照片数量
        return photos.filter(photo => photo.exported !== true && photo.username === username).length;
    } else {
        // 返回所有用户的未导出照片数量
        return photos.filter(photo => photo.exported !== true).length;
    }
}

// 获取未导出的货号数量
function getUnexportedProductCodesCount(username) {
    const photos = readPhotos();
    // 过滤未导出的照片
    const unexportedPhotos = photos.filter(photo => photo.exported !== true);
    // 如果指定了用户名，再过滤用户
    const filteredPhotos = username ? unexportedPhotos.filter(photo => photo.username === username) : unexportedPhotos;
    // 提取货号（去除系统生成的批次ID和时间戳）
    const productCodes = new Set();
    filteredPhotos.forEach(photo => {
        if (photo.productCode) {
            let productCode = photo.productCode;
            // 处理下划线分隔的情况（如 123-1_1774013466067）
            if (productCode.includes('_')) {
                const parts = productCode.split('_');
                if (parts.length > 1) {
                    productCode = parts[0];
                }
            }
            // 找到第一个10-15位数字的时间戳部分
            const timestampMatch = productCode.match(/-([0-9]{10,15})-/);
            if (timestampMatch) {
                // 提取时间戳之前的部分作为原始货号
                const timestampIndex = timestampMatch.index;
                productCode = productCode.substring(0, timestampIndex);
            }
            // 处理连字符分隔的情况，只去除末尾的时间戳部分（10-15位数字）
            productCode = productCode.replace(/-([0-9]{10,15})\b$/, '');
            // 清理货号，确保只包含字母、数字和连字符
            productCode = productCode.replace(/[^a-zA-Z0-9-]/g, '').trim();
            if (productCode) {
                productCodes.add(productCode);
            }
        }
    });
    return productCodes.size;
}

function updatePhoto(id, updates) {
    return new Promise((resolve) => {
        writeLock = writeLock.then(() => {
            try {
                console.log('开始更新照片:', id, updates);
                const photos = readPhotos();
                console.log('读取到照片数量:', photos.length);

                const photoIndex = photos.findIndex(p => p.id === id);
                console.log('找到照片索引:', photoIndex);

                if (photoIndex === -1) {
                    console.log('照片不存在:', id);
                    resolve(false);
                    return;
                }

                console.log('更新前的照片信息:', photos[photoIndex]);
                photos[photoIndex] = { ...photos[photoIndex], ...updates };
                console.log('更新后的照片信息:', photos[photoIndex]);

                const result = writePhotos(photos);
                console.log('写入结果:', result);
                resolve(result);
            } catch (error) {
                console.error('更新照片失败:', error);
                resolve(false);
            }
        });
    });
}

module.exports = {
    storageConfig,
    ensureDirectories,
    addPhoto,
    addPhotosBatch,
    deletePhoto,
    getAllPhotos,
    getPhotoById,
    updatePhotoExportStatus,
    updatePhoto,
    getUnexportedPhotosCount,
    getUnexportedProductCodesCount,
    setBroadcast
};