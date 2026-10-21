# 小蓝 · V10 化妆桌伙伴（v5）

公开页面：https://zhananbigdan-prog.github.io/v10-terminal/?v=5

## 已完成
- 原创 SVG 蓝白色机器人：眨眼、轻晃，聆听/思考/说话状态。
- 普通文档流布局，兼容 V10 钉钉窄窗口；无需摄像头常开。
- Open-Meteo 城市天气，默认如皋城区；显示数据时间，失败明确提示。
- 基于体感温度、降雨概率的规则穿衣建议，不伪装成 AI 回答。
- v4 已实机验证的 Web Audio 单声道 PCM16 WAV 收音/回放，最多15秒；v5 复用并有模拟测试。
- 夜间纯黑网页（默认22:30—07:00），点击临时唤醒2分钟。网页不能保证关闭硬件背光；钉钉工具栏需全屏才可能隐藏。
- 可设置定时早安（默认关闭）。页面运行、用户解锁声音、系统允许播放时才会尝试；不是后台闹钟，不是手机铃声识别。
- 对话前后端接口、DeepSeek 文本调用、本机 macOS 中文 say → WAV 朗读。

## 尚未完成/未验证
- DeepSeek 密钥尚未提供，未执行真实模型调用。
- 后端尚未向 V10 提供 HTTPS 可达地址；GitHub Pages 仅托管前端，不能运行 Python 后端。
- 本机已安装语音识别依赖、下载 base 模型，并完成合成中文音频的识别测试；真实 V10 录音全链路仍待后端连通后验证。
- v5 尚待 V10 实机检查。持续免手唤醒、手机闹钟声音识别和控制屏幕背光均未实现。

## 本机后端
`server/app.py` 仅绑定127.0.0.1:8788。使用 Python 标准库调用 DeepSeek，不依赖 OpenAI API。语音识别使用本地 faster-whisper，朗读用 macOS Tingting。已知兼容录音页保留于 `diagnostics/v4.html`。

1. 复制 `.env.example` 为 `.env.local`，只在本机配置 DEEPSEEK_API_KEY 和独立 COMPANION_TOKEN。
2. `.venv/bin/python -m pip install -r server/requirements.txt`。
3. 下载模型到 `models/whisper-base`，将绝对目录写入 WHISPER_MODEL_PATH。服务不会暗中下载模型。
4. `.venv/bin/python server/app.py`。
5. 给后端配置 HTTPS 可达地址后，在网页设置填写地址及 COMPANION_TOKEN。不要填写 DeepSeek 密钥。

公开前端默认不会发送录音；配置服务地址/口令并主动点击录音发送后，录音传给自己的后端、本机识别文字发给 DeepSeek。历史对话仅页面内存保留，页面内的设置和后端访问口令保存在该设备 localStorage。后端禁止无口令请求，限制来源、请求大小和并发数，不记录对话内容。

## 验证
- `node tests/core.cjs`：夜间跨日边界、穿衣阈值、缺失天气。
- `node tests/audio-capture.cjs`：原 v4 PCM/WAV 与资源清理。
- `node tests/companion-capture.cjs`：v5 PCM/WAV 与资源清理。
- `python3 -m py_compile server/app.py`。
- 电脑 Chrome：桌面/520×600 窄窗口、设置、黑屏/点击唤醒、实时天气；本机 say/afconvert 已生成有效中文 WAV。

参考：
- https://api-docs.deepseek.com/api/create-chat-completion/
- https://open-meteo.com/en/docs

不要上传 `.env.local`、模型文件或录音到公开仓库。

本机识别验证：Tingting 合成中文 WAV → faster-whisper base，识别出“早上好,今天的天气怎么样,我应该穿什么衣服”。冷启动约18.6秒，不是低延迟实时语音。PyAV 固定 <17。
