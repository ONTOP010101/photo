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
        cb(null, file.originalname);
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
        
        let username = req.body.username || 'unknown';
        
        // 检查是否有共享码，如果有，获取共享所有者
        if (req.body.shareCode) {
            const owner = authManager.getShareOwner(req.body.shareCode);
            if (owner) {
                username = owner;
                console.log('共享所有者:', owner);
            }
        }
        
        const photo = {
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            timestamp: new Date().toISOString(),
            productCode: req.body.productCode || '未分类',
            username: username
        };
        
        console.log('照片对象:', photo);

        const newPhoto = storageManager.addPhoto(photo);
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
        
        let username = req.body.username || 'unknown';
        
        // 检查是否有共享码，如果有，获取共享所有者
        if (req.body.shareCode) {
            const owner = authManager.getShareOwner(req.body.shareCode);
            if (owner) {
                username = owner;
                console.log('共享所有者:', owner);
            }
        }
        
        const photos = req.files.map(file => ({
            filename: file.filename,
            path: `/uploads/${file.filename}`,
            timestamp: new Date().toISOString(),
            productCode: req.body.productCode || '未分类',
            username: username
        }));
        
        console.log('批量上传照片对象:', photos);

        const newPhotos = photos.map(photo => storageManager.addPhoto(photo));
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
    
    const parsedId = parseInt(id);
    console.log('解析后的ID:', parsedId);
    console.log('解析后ID类型:', typeof parsedId);
    
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
        const { username, shareName } = req.body;
        
        if (!username || !shareName) {
            return res.status(400).json({ error: '请提供用户名和共享名称' });
        }
        
        const result = authManager.createShare(username, shareName);
        
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

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
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
    setInterval(() => {
        // 每5分钟发送一次心跳，保持服务器运行
        console.log('服务器心跳正常');
    }, 300000);
} catch (error) {
    console.error('启动服务器时发生错误:', error);
    console.error('错误堆栈:', error.stack);
}