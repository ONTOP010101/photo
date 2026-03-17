const fs = require('fs');
const path = require('path');

// 读取photos.json文件
const photosJsonPath = path.join(__dirname, 'data', 'photos.json');
const uploadsDir = path.join(__dirname, 'uploads');

console.log('开始清理不存在的图片引用...');

try {
    // 读取photos.json文件
    const photosData = fs.readFileSync(photosJsonPath, 'utf8');
    const photos = JSON.parse(photosData);
    
    console.log(`原始照片数量: ${photos.length}`);
    
    // 检查每个照片文件是否存在
    const existingPhotos = [];
    const missingPhotos = [];
    
    photos.forEach(photo => {
        // 从路径中提取文件名
        const filename = photo.filename;
        const filePath = path.join(uploadsDir, filename);
        
        if (fs.existsSync(filePath)) {
            existingPhotos.push(photo);
        } else {
            missingPhotos.push(photo);
        }
    });
    
    console.log(`存在的照片数量: ${existingPhotos.length}`);
    console.log(`缺失的照片数量: ${missingPhotos.length}`);
    
    if (missingPhotos.length > 0) {
        console.log('缺失的照片:');
        missingPhotos.forEach(photo => {
            console.log(`- ${photo.filename} (ID: ${photo.id})`);
        });
        
        // 写回更新后的数据
        fs.writeFileSync(photosJsonPath, JSON.stringify(existingPhotos, null, 2));
        console.log('已从photos.json中移除缺失的照片引用');
    } else {
        console.log('所有照片文件都存在，无需清理');
    }
    
} catch (error) {
    console.error('清理过程中出现错误:', error);
}

console.log('清理完成!');
