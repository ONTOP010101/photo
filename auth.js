const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 认证配置
const authConfig = {
    usersFile: path.join(__dirname, 'data', 'users.json'),
    sharesFile: path.join(__dirname, 'data', 'shares.json')
};

// 确保目录存在
function ensureDirectories() {
    const dataDir = path.dirname(authConfig.usersFile);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(authConfig.usersFile)) {
        fs.writeFileSync(authConfig.usersFile, JSON.stringify([]));
    }
    
    if (!fs.existsSync(authConfig.sharesFile)) {
        fs.writeFileSync(authConfig.sharesFile, JSON.stringify([]));
    }
}

// 读取用户数据
function readUsers() {
    ensureDirectories();
    try {
        const data = fs.readFileSync(authConfig.usersFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取用户数据失败:', error);
        return [];
    }
}

// 写入用户数据
function writeUsers(users) {
    ensureDirectories();
    try {
        fs.writeFileSync(authConfig.usersFile, JSON.stringify(users, null, 2));
        return true;
    } catch (error) {
        console.error('写入用户数据失败:', error);
        return false;
    }
}

// 读取共享数据
function readShares() {
    ensureDirectories();
    try {
        const data = fs.readFileSync(authConfig.sharesFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取共享数据失败:', error);
        return [];
    }
}

// 写入共享数据
function writeShares(shares) {
    ensureDirectories();
    try {
        fs.writeFileSync(authConfig.sharesFile, JSON.stringify(shares, null, 2));
        return true;
    } catch (error) {
        console.error('写入共享数据失败:', error);
        return false;
    }
}

// 生成密码哈希
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
}

// 验证密码
function verifyPassword(password, salt, hash) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return verifyHash === hash;
}

// 注册用户
function registerUser(username, name, password, role = 'user') {
    const users = readUsers();
    
    // 检查用户名是否已存在
    if (users.some(user => user.username === username)) {
        return { success: false, message: '用户名已存在' };
    }
    
    // 生成密码哈希
    const { salt, hash } = hashPassword(password);
    
    const newUser = {
        id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
        username,
        name,
        salt,
        hash,
        role,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeUsers(users);
    
    return { success: true, user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role } };
}

// 登录用户
function loginUser(username, password) {
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return { success: false, message: '用户名或密码错误' };
    }
    
    if (!verifyPassword(password, user.salt, user.hash)) {
        return { success: false, message: '用户名或密码错误' };
    }
    
    return { success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
}

// 根据ID获取用户
function getUserById(id) {
    const users = readUsers();
    const user = users.find(u => u.id === id);
    if (!user) return null;
    
    return { id: user.id, username: user.username, name: user.name, role: user.role, createdAt: user.createdAt };
}

// 获取所有用户
function getAllUsers() {
    const users = readUsers();
    return users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
    }));
}

// 更新用户
function updateUser(id, updates) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
        return { success: false, message: '用户不存在' };
    }
    
    const user = users[userIndex];
    
    // 更新用户信息
    if (updates.name) {
        user.name = updates.name;
    }
    
    if (updates.password) {
        const { salt, hash } = hashPassword(updates.password);
        user.salt = salt;
        user.hash = hash;
    }
    
    if (updates.role) {
        user.role = updates.role;
    }
    
    users[userIndex] = user;
    writeUsers(users);
    
    return { success: true, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
}

// 删除用户
function deleteUser(id) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === id);
    
    if (userIndex === -1) {
        return { success: false, message: '用户不存在' };
    }
    
    users.splice(userIndex, 1);
    writeUsers(users);
    
    return { success: true, message: '用户删除成功' };
}

// 更新用户角色
function updateUserRole(id, role) {
    return updateUser(id, { role });
}

// 修改密码
function changePassword(username, currentPassword, newPassword) {
    const users = readUsers();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        return { success: false, message: '用户不存在' };
    }
    
    const user = users[userIndex];
    
    // 验证当前密码
    if (!verifyPassword(currentPassword, user.salt, user.hash)) {
        return { success: false, message: '当前密码错误' };
    }
    
    // 生成新密码哈希
    const { salt, hash } = hashPassword(newPassword);
    user.salt = salt;
    user.hash = hash;
    
    users[userIndex] = user;
    writeUsers(users);
    
    return { success: true, message: '密码修改成功' };
}

// 创建共享
function createShare(username, shareName, shareCode) {
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return { success: false, message: '用户不存在' };
    }
    
    // 使用传入的共享码，如果没有传入则生成4位数随机共享码
    const code = shareCode || Math.floor(1000 + Math.random() * 9000).toString();
    
    const shares = readShares();
    const newShare = {
        id: shares.length > 0 ? Math.max(...shares.map(s => s.id)) + 1 : 1,
        code: code,
        name: shareName,
        owner: username,
        members: [username],
        createdAt: new Date().toISOString()
    };
    
    shares.push(newShare);
    writeShares(shares);
    
    return { success: true, share: newShare };
}

// 加入共享
function joinShare(username, shareCode) {
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return { success: false, message: '用户不存在' };
    }
    
    const shares = readShares();
    const share = shares.find(s => s.code === shareCode);
    
    if (!share) {
        return { success: false, message: '共享不存在' };
    }
    
    // 检查用户是否已经在共享中
    if (share.members.includes(username)) {
        return { success: false, message: '用户已经在共享中' };
    }
    
    // 添加用户到共享
    share.members.push(username);
    writeShares(shares);
    
    return { success: true, share };
}

// 获取用户的共享信息
function getUserShare(username) {
    const shares = readShares();
    // 查找用户加入的共享
    const userShares = shares.filter(share => share.members.includes(username));
    return userShares;
}

// 获取共享所有者
function getShareOwner(shareCode) {
    const shares = readShares();
    const share = shares.find(s => s.code === shareCode);
    return share ? share.owner : null;
}

// 解散共享房间
function deleteShare(username, shareCode) {
    const shares = readShares();
    const shareIndex = shares.findIndex(s => s.code === shareCode);
    
    if (shareIndex === -1) {
        return { success: false, message: '共享房间不存在' };
    }
    
    const share = shares[shareIndex];
    
    // 只有创建者可以解散房间
    if (share.owner !== username) {
        return { success: false, message: '只有创建者可以解散房间' };
    }
    
    // 从共享列表中移除
    shares.splice(shareIndex, 1);
    writeShares(shares);
    
    return { success: true, message: '共享房间已解散' };
}

module.exports = {
    authConfig,
    registerUser,
    loginUser,
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser,
    updateUserRole,
    changePassword,
    createShare,
    joinShare,
    getUserShare,
    getShareOwner,
    deleteShare
};