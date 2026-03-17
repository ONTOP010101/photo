const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const storageManager = require('./storage');
const authManager = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 确保目录存在
storageManager.ensureDirectories();

// 存储配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, storageManager.storageConfig.uploadDir);
    },
    filename: function (req, file, cb) {
        // 使用前端传递的原始文件名（包含货号）
        // 确保文件名使用UTF-8编码
        const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB per file
        files: 10 // max 10 files
    }
});

// 根路径重定向到admin.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API路由

// 上传照片
app.post('/api/photos', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        // 打印请求体，检查username是否存在
        console.log('请求体:', req.body);
        console.log('用户名:', req.body.username);
        console.log('共享码:', req.body.shareCode);
        console.log('产品代码:', req.body.productCode);
        
        let username = req.body.username || 'unknown';
        console.log('最终使用的用户名:', username);
        
        // 检查是否有共享码，如果有，保持实际拍摄者的用户名
        // 这样可以区分不同用户在共享组中拍摄的照片
        if (req.body.shareCode) {
            const owner = authManager.getShareOwner(req.body.shareCode);
            if (owner) {
                console.log('共享所有者:', owner);
                console.log('实际拍摄者:', username);
            } else {
                console.log('共享码无效或不存在:', req.body.shareCode);
            }
        }
        
        const photo = {
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            timestamp: new Date().toISOString(),
            productCode: req.body.productCode || '未分类',
            username: username,
            shareCode: req.body.shareCode || null
        };
        
        console.log('照片对象:', photo);
        console.log('准备添加照片到存储');
        
        const newPhoto = storageManager.addPhoto(photo);
        console.log('照片添加成功:', newPhoto);
        res.status(201).json(newPhoto);
    } catch (error) {
        console.error('上传失败:', error);
        res.status(500).json({ error: '上传失败' });
    }
});

// 批量上传照片
app.post('/api/photos/batch', upload.array('photos', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: '没有上传文件' });
        }

        // 打印请求体，检查username是否存在
        console.log('请求体:', req.body);
        console.log('用户名:', req.body.username);
        console.log('共享码:', req.body.shareCode);
        console.log('产品代码:', req.body.productCode);
        console.log('上传文件数量:', req.files.length);
        
        let username = req.body.username || 'unknown';
        console.log('最终使用的用户名:', username);
        
        // 检查是否有共享码，如果有，保持实际拍摄者的用户名
        // 这样可以区分不同用户在共享组中拍摄的照片
        if (req.body.shareCode) {
            const owner = authManager.getShareOwner(req.body.shareCode);
            if (owner) {
                console.log('共享所有者:', owner);
                console.log('实际拍摄者:', username);
            } else {
                console.log('共享码无效或不存在:', req.body.shareCode);
            }
        }
        
        const photos = req.files.map(file => ({
            filename: file.filename,
            path: `/uploads/${file.filename}`,
            timestamp: new Date().toISOString(),
            productCode: req.body.productCode || '未分类',
            username: username,
            shareCode: req.body.shareCode || null
        }));
        
        console.log('批量上传照片对象:', photos);
        console.log('准备批量添加照片到存储');

        const newPhotos = photos.map(photo => {
            const newPhoto = storageManager.addPhoto(photo);
            console.log('照片添加成功:', newPhoto);
            return newPhoto;
        });
        
        console.log('批量上传完成，成功添加', newPhotos.length, '张照片');
        res.status(201).json({ photos: newPhotos, count: newPhotos.length });
    } catch (error) {
        console.error('批量上传失败:', error);
        res.status(500).json({ error: '批量上传失败' });
    }
});

// 获取所有照片
app.get('/api/photos', (req, res) => {
    const photos = storageManager.getAllPhotos();
    res.json(photos);
});

// 获取单个照片
app.get('/api/photos/:id', (req, res) => {
    const { id } = req.params;
    const photo = storageManager.getPhotoById(parseInt(id));
    
    if (!photo) {
        return res.status(404).json({ error: '照片不存在' });
    }
    
    res.json(photo);
});

// 删除照片
app.delete('/api/photos/:id', (req, res) => {
    const { id } = req.params;
    console.log('收到删除照片请求，ID:', id);
    console.log('ID类型:', typeof id);
    
    // 获取用户名（从请求体中获取）
    const username = req.body.username || req.query.username;
    console.log('请求删除的用户名:', username);
    
    const parsedId = parseInt(id);
    console.log('解析后的ID:', parsedId);
    console.log('解析后ID类型:', typeof parsedId);
    
    // 获取照片信息
    const photo = storageManager.getPhotoById(parsedId);
    if (!photo) {
        console.log('照片不存在，ID:', parsedId);
        return res.status(404).json({ error: '照片不存在' });
    }
    
    // 检查权限：
    // 1. 对于非共享照片，只有拍摄者才能删除
    // 2. 对于共享照片，只有共享房间的创建者才能删除，拍摄者不能删除
    console.log('检查权限开始');
    console.log('照片信息:', photo);
    console.log('请求删除的用户名:', username);
    
    if (!photo.shareCode) {
        // 非共享照片，只有拍摄者才能删除
        console.log('非共享照片，检查拍摄者:', photo.username, 'vs', username);
        if (photo.username !== username) {
            console.log('权限不足，只能删除自己的非共享照片');
            return res.status(403).json({ error: '权限不足，只能删除自己的非共享照片' });
        }
    } else {
        // 共享照片，只有共享房间的创建者才能删除
        const owner = authManager.getShareOwner(photo.shareCode);
        console.log('共享照片，共享房间所有者:', owner, 'vs', username);
        if (owner !== username) {
            console.log('权限不足，只有共享房间的创建者才能删除共享照片');
            return res.status(403).json({ error: '权限不足，只有共享房间的创建者才能删除共享照片' });
        }
    }
    console.log('权限检查通过');
    
    
    const success = storageManager.deletePhoto(parsedId);
    console.log('删除操作结果:', success);
    
    if (!success) {
        console.log('照片不存在，ID:', parsedId);
        return res.status(404).json({ error: '照片不存在' });
    }
    
    console.log('照片删除成功，ID:', parsedId);
    res.json({ message: '照片删除成功' });
});

// 用户认证路由

// 注册
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, name, password, role } = req.body;
        
        if (!username || !name || !password) {
            return res.status(400).json({ error: '请提供用户名、姓名和密码' });
        }
        
        const result = authManager.registerUser(username, name, password, role);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.status(201).json({ message: '注册成功', user: result.user });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ error: '注册失败' });
    }
});

// 登录
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: '请提供用户名和密码' });
        }
        
        const result = authManager.loginUser(username, password);
        
        if (!result.success) {
            return res.status(401).json({ error: result.message });
        }
        
        res.json({ message: '登录成功', user: result.user });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// 用户管理路由

// 获取所有用户
app.get('/api/auth/users', (req, res) => {
    try {
        const users = authManager.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('获取用户列表失败:', error);
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 获取单个用户
app.get('/api/auth/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const user = authManager.getUserById(parseInt(id));
        
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('获取用户失败:', error);
        res.status(500).json({ error: '获取用户失败' });
    }
});

// 更新用户
app.put('/api/auth/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const result = authManager.updateUser(parseInt(id), updates);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '用户更新成功', user: result.user });
    } catch (error) {
        console.error('更新用户失败:', error);
        res.status(500).json({ error: '更新用户失败' });
    }
});

// 删除用户
app.delete('/api/auth/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        // 检查权限，只有管理员才能删除用户
        if (!role || role !== 'admin') {
            return res.status(403).json({ error: '权限不足，只有管理员才能删除用户' });
        }
        
        const result = authManager.deleteUser(parseInt(id));
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '用户删除成功' });
    } catch (error) {
        console.error('删除用户失败:', error);
        res.status(500).json({ error: '删除用户失败' });
    }
});

// 更新用户角色
app.put('/api/auth/users/:id/role', (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!role) {
            return res.status(400).json({ error: '请提供角色' });
        }
        
        const result = authManager.updateUserRole(parseInt(id), role);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '角色更新成功', user: result.user });
    } catch (error) {
        console.error('更新角色失败:', error);
        res.status(500).json({ error: '更新角色失败' });
    }
});

// 修改密码
app.post('/api/auth/change-password', (req, res) => {
    try {
        const { username, currentPassword, newPassword } = req.body;
        
        if (!username || !currentPassword || !newPassword) {
            return res.status(400).json({ error: '请提供用户名、当前密码和新密码' });
        }
        
        const result = authManager.changePassword(username, currentPassword, newPassword);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ error: '修改密码失败' });
    }
});

// 创建共享
app.post('/api/auth/create-share', (req, res) => {
    try {
        const { username, shareName, shareCode } = req.body;
        
        if (!username || !shareName) {
            return res.status(400).json({ error: '请提供用户名和共享名称' });
        }
        
        const result = authManager.createShare(username, shareName, shareCode);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '共享创建成功', share: result.share });
    } catch (error) {
        console.error('创建共享失败:', error);
        res.status(500).json({ error: '创建共享失败' });
    }
});

// 加入共享
app.post('/api/auth/join-share', (req, res) => {
    try {
        const { username, shareCode } = req.body;
        
        if (!username || !shareCode) {
            return res.status(400).json({ error: '请提供用户名和共享码' });
        }
        
        const result = authManager.joinShare(username, shareCode);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '加入共享成功', share: result.share });
    } catch (error) {
        console.error('加入共享失败:', error);
        res.status(500).json({ error: '加入共享失败' });
    }
});

// 获取用户的共享信息
app.get('/api/auth/user-shares/:username', (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username) {
            return res.status(400).json({ error: '请提供用户名' });
        }
        
        const shares = authManager.getUserShare(username);
        res.json({ shares });
    } catch (error) {
        console.error('获取共享信息失败:', error);
        res.status(500).json({ error: '获取共享信息失败' });
    }
});

// 获取共享所有者
app.get('/api/auth/share-owner/:shareCode', (req, res) => {
    try {
        const { shareCode } = req.params;
        
        if (!shareCode) {
            return res.status(400).json({ error: '请提供共享码' });
        }
        
        const owner = authManager.getShareOwner(shareCode);
        res.json({ owner });
    } catch (error) {
        console.error('获取共享所有者失败:', error);
        res.status(500).json({ error: '获取共享所有者失败' });
    }
});

// 解散共享房间
app.delete('/api/auth/delete-share', (req, res) => {
    try {
        const { username, shareCode } = req.body;
        
        if (!username || !shareCode) {
            return res.status(400).json({ error: '请提供用户名和共享码' });
        }
        
        const result = authManager.deleteShare(username, shareCode);
        
        if (!result.success) {
            return res.status(400).json({ error: result.message });
        }
        
        res.json({ message: '共享房间已解散' });
    } catch (error) {
        console.error('解散共享房间失败:', error);
        res.status(500).json({ error: '解散共享房间失败' });
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 获取所有共享房间（包括已解散的）
app.get('/api/auth/shares', (req, res) => {
    try {
        const shares = authManager.getAllShares();
        res.json(shares);
    } catch (error) {
        console.error('获取共享房间失败:', error);
        res.status(500).json({ error: '获取共享房间失败' });
    }
});

// 获取用户创建的所有共享码（包括已解散的）
app.get('/api/auth/user-created-shares/:username', (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ error: '请提供用户名' });
        }
        const shareCodes = authManager.getUserCreatedShareCodes(username);
        res.json({ shareCodes });
    } catch (error) {
        console.error('获取用户创建的共享码失败:', error);
        res.status(500).json({ error: '获取用户创建的共享码失败' });
    }
});

// 更新照片导出状态
app.put('/api/photos/:id/exported', (req, res) => {
    try {
        const { id } = req.params;
        const { exported } = req.body;
        
        if (exported === undefined) {
            return res.status(400).json({ error: '请提供导出状态' });
        }
        
        const success = storageManager.updatePhotoExportStatus(parseInt(id), exported);
        
        if (!success) {
            return res.status(404).json({ error: '照片不存在' });
        }
        
        res.json({ message: '导出状态更新成功' });
    } catch (error) {
        console.error('更新导出状态失败:', error);
        res.status(500).json({ error: '更新导出状态失败' });
    }
});

// 静态文件服务
app.use(express.static('.'));
app.use('/uploads', express.static(storageManager.storageConfig.uploadDir));

// 启动服务器
try {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log(`网络访问地址: http://192.168.40.252:${PORT}`);
        console.log(`前端登录页面: http://192.168.40.252:${PORT}`);
        console.log(`管理后台: http://192.168.40.252:${PORT}/admin.html`);
        console.log(`健康检查: http://192.168.40.252:${PORT}/health`);
        console.log(`上传API: http://192.168.40.252:${PORT}/api/photos`);
        console.log(`获取照片API: http://192.168.40.252:${PORT}/api/photos`);
        console.log(`注册API: http://192.168.40.252:${PORT}/api/auth/register`);
        console.log(`登录API: http://192.168.40.252:${PORT}/api/auth/login`);
    });
    
    server.on('error', (error) => {
        console.error('服务器启动错误:', error);
    });
    
    // 保持服务器运行
    process.on('SIGINT', () => {
        console.log('正在关闭服务器...');
        server.close(() => {
            console.log('服务器已关闭');
            process.exit(0);
        });
    });
    
    // 防止服务器在Trae环境中自动退出
        console.log('服务器已启动，正在运行中...');
        // 保持服务器运行的最简单方法是监听一个不会被触发的事件
        process.stdin.resume();
        setInterval(() => {
            // 每1分钟发送一次心跳，保持服务器运行
            console.log('服务器心跳正常');
        }, 60000);
} catch (error) {
    console.error('启动服务器时发生错误:', error);
    console.error('错误堆栈:', error.stack);
}