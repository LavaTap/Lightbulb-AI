/**
 * 读取数据库中的混元配置
 */

import { getAllModelConfigs } from '../src/database.js';

async function readHunyuanConfig() {
  try {
    const configs = await getAllModelConfigs();
    const hunyuanConfigs = configs.filter(c =>
      c.provider === 'tencent' ||
      c.model.toLowerCase().includes('hy') ||
      c.model.toLowerCase().includes('hunyuan') ||
      c.name.toLowerCase().includes('混元')
    );

    if (hunyuanConfigs.length === 0) {
      console.log('❌ 数据库中没有找到腾讯混元模型配置');
      console.log('请先在前端界面添加混元3.0模型配置，或手动配置到测试文件中');
      process.exit(1);
    }

    console.log('✅ 找到以下混元模型配置:');
    console.log('==================================');
    hunyuanConfigs.forEach((config, index) => {
      console.log(`[${index + 1}] ${config.name}`);
      console.log(`  模型ID: ${config.id}`);
      console.log(`  服务商: ${config.provider}`);
      console.log(`  模型标识: ${config.model}`);
      console.log(`  API Key: ${config.api_key ? '✅ 已配置' : '❌ 未配置'}`);
      console.log(`  Endpoint: ${config.endpoint || '默认'}`);
      console.log(`  是否激活: ${config.is_active ? '✅ 是' : '❌ 否'}`);
      console.log();
    });

    // 返回第一个激活的混元配置，如果没有激活的就返回第一个
    const activeConfig = hunyuanConfigs.find(c => c.is_active) || hunyuanConfigs[0];
    console.log('👉 使用以下配置运行测试:');
    console.log(`  名称: ${activeConfig.name}`);
    console.log(`  模型: ${activeConfig.model}`);
    console.log(`  API Key: ${activeConfig.api_key ? '***' + activeConfig.api_key.slice(-8) : '未配置'}`);

    // 输出配置信息，方便后续使用
    console.log('\n📋 配置JSON:');
    console.log(JSON.stringify({
      provider: activeConfig.provider,
      model: activeConfig.model,
      apiKey: activeConfig.api_key,
      endpoint: activeConfig.endpoint || 'https://tokenhub.tencentmaas.com/v1/api/image',
      useProxy: activeConfig.use_proxy === 1,
      proxyEndpoint: activeConfig.proxy_endpoint || ''
    }, null, 2));

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 读取数据库配置失败:', error.message);
    process.exit(1);
  }
}

readHunyuanConfig().catch(console.error);
