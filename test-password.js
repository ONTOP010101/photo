const crypto = require('crypto');

// 测试密码验证
function testPassword() {
    // admin1用户的信息
    const username = 'admin1';
    const password = 'admin123';
    const salt = 'ef79c363fc53a75d17b54566c8b98e32';
    const hash = '2dab933cd98d87e022598c29d22895821df169eba2f34ba8f7de84275f9f1963f7db3732d19c10e66b19136c1e011e2831eca7f6c231bb4f266dbdb771ba4366';
    
    // 生成哈希
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    console.log('测试用户:', username);
    console.log('输入密码:', password);
    console.log('存储的salt:', salt);
    console.log('存储的hash:', hash);
    console.log('生成的hash:', verifyHash);
    console.log('密码是否匹配:', verifyHash === hash);
}

testPassword();
