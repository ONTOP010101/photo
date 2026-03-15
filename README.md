# H5拍照应用

一个基于H5的拍照应用，支持相机访问、照片上传和后端存储。

## 项目结构

```
├── index.html          # 前端H5页面
├── styles.css          # 前端样式
├── script.js           # 前端逻辑
├── server.js           # 后端服务器
├── storage.js          # 存储管理模块
├── auth.js             # 用户认证模块
├── package.json        # 项目配置和依赖
├── .gitignore          # Git忽略文件
└── README.md           # 项目文档
```

## 功能特性

- **前端功能**：
  - 相机访问和实时预览
  - 拍照和照片预览
  - 照片上传到后端
  - 相册展示

- **后端功能**：
  - 照片上传和存储
  - 照片元数据管理
  - 用户注册和登录
  - RESTful API接口

## 技术栈

- **前端**：HTML5, CSS3, JavaScript
- **后端**：Node.js, Express
- **存储**：本地文件系统
- **认证**：密码哈希加密

## 安装步骤

1. **克隆项目**
   ```bash
   git clone <项目地址>
   cd <项目目录>
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动后端服务**
   ```bash
   # 开发模式
   npm run dev
   
   # 生产模式
   npm start
   ```

4. **访问前端页面**
   打开浏览器，访问 `http://localhost:3000` 或直接打开 `index.html` 文件。

## API接口

### 照片相关

- **POST /api/photos** - 上传照片
- **GET /api/photos** - 获取所有照片
- **GET /api/photos/:id** - 获取单个照片
- **DELETE /api/photos/:id** - 删除照片

### 用户认证

- **POST /api/auth/register** - 用户注册
- **POST /api/auth/login** - 用户登录

### 健康检查

- **GET /health** - 检查服务器状态

## 环境要求

- Node.js 12.0+
- 现代浏览器（支持MediaDevices API）

## 注意事项

1. **相机权限**：浏览器需要获取相机访问权限
2. **CORS设置**：已配置跨域访问，可根据需要调整
3. **存储路径**：照片存储在 `uploads` 目录，元数据存储在 `data` 目录
4. **安全考虑**：密码使用PBKDF2加密存储，生产环境应考虑使用HTTPS

## 开发指南

1. **前端开发**：修改 `index.html`、`styles.css` 和 `script.js` 文件
2. **后端开发**：修改 `server.js`、`storage.js` 和 `auth.js` 文件
3. **依赖管理**：通过 `package.json` 管理项目依赖

## 部署建议

1. **生产环境**：使用PM2或类似工具管理Node.js进程
2. **存储优化**：考虑使用云存储服务（如OSS、S3）存储照片
3. **数据库**：考虑使用MongoDB或MySQL存储元数据
4. **安全性**：配置HTTPS，使用环境变量管理敏感信息

## 许可证

MIT License
